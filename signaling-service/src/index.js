require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const Redis = require('ioredis');
const logger = require('./utils/logger');
const httpClient = require('http');
const GuestConnectionManager = require('./managers/GuestConnectionManager');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS || "*",
    methods: ["GET", "POST"]
  }
});

// Redis client setup
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || '12qwaszx'
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Guest users storage
const guestUsers = new Map();

// Initialize Guest Connection Manager
const guestConnectionManager = new GuestConnectionManager(io);

// Socket authentication middleware
io.use(async (socket, next) => {
  try {
    // Check for guest connection
    const { userId, name, isGuest } = socket.handshake.query;
    
    if (isGuest === 'true' && userId && name) {
      socket.userId = userId;
      socket.userName = name;
      socket.isGuest = true;
      return next();
    }
    
    // Regular token-based authentication
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key');
    // guest도 허용
    if (decoded.role === 'guest' || decoded.role === 'user' || decoded.role === 'admin') {
      socket.userId = decoded.id || decoded.userId;
      socket.userName = decoded.name || decoded.userName;
      socket.isGuest = decoded.role === 'guest';
      return next();
    }
    return next(new Error('Not allowed'));
  } catch (error) {
    logger.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
});

// Socket connection handling
io.on('connection', async (socket) => {
  logger.info(`User connected: ${socket.userId} (Guest: ${socket.isGuest})`);
  
  // Handle guest users
  if (socket.isGuest) {
    // 기존 로직 유지
    guestUsers.set(socket.userId, {
      id: socket.userId,
      name: socket.userName,
      socketId: socket.id
    });
    
    // Redis에 게스트 정보 저장
    const userInfo = {
      name: socket.userName,
      socketId: socket.id,
      connectedAt: new Date().toISOString(),
      isGuest: true
    };
    
    redis.hset('users:online', socket.userId, JSON.stringify(userInfo))
      .then(() => {
        logger.info(`Guest user saved to Redis: ${socket.userId} with info: ${JSON.stringify(userInfo)}`);
      })
      .catch(err => {
        logger.error(`Failed to save guest to Redis: ${err}`);
      });
    
    // GuestConnectionManager에 등록
    try {
      await guestConnectionManager.registerGuest(socket, {
        userId: socket.userId,
        name: socket.userName
      });
    } catch (error) {
      logger.error('Failed to register guest in connection manager:', error);
    }
    
    logger.info(`Guest user added to list: ${socket.userId}, total guests: ${guestUsers.size}`);
    
    // Notify all users about new guest
    socket.broadcast.emit('guestJoined', {
      userId: socket.userId,
      name: socket.userName
    });
    
    // Send current guest list to new guest
    const guestList = Array.from(guestUsers.values()).filter(g => g.id !== socket.userId);
    logger.info(`Sending guest list to ${socket.userId}: ${JSON.stringify(guestList)}`);
    
    // 각 게스트를 guestJoined 이벤트로 개별 전송
    guestList.forEach(guest => {
      socket.emit('guestJoined', {
        userId: guest.id,
        name: guest.name
      });
    });
  }

  // Join room
  socket.on('join-room', async (roomId) => {
    try {
      const roomData = await redis.get(`room:${roomId}`);
      if (!roomData) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const room = JSON.parse(roomData);
      if (room.status !== 'active') {
        socket.emit('error', { message: 'Room is not active' });
        return;
      }

      // Join the room
      socket.join(roomId);
      socket.roomId = roomId;

      // Notify others in the room
      socket.to(roomId).emit('user-joined', {
        userId: socket.userId,
        userName: socket.userName
      });

      // Get list of connected users in the room
      const sockets = await io.in(roomId).fetchSockets();
      const participants = sockets.map(s => ({
        userId: s.userId,
        userName: s.userName
      }));

      socket.emit('room-users', participants);

      logger.info(`User ${socket.userId} joined room ${roomId}`);
    } catch (error) {
      logger.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Handle call initiation
  socket.on('call-user', (data) => {
    logger.info(`[Signaling] call-user event - from: ${socket.userId}, to: ${data.targetUserId}, callType: ${data.callType}`);
    
    const targetUser = guestUsers.get(data.targetUserId);
    if (!targetUser) {
      logger.error(`[Signaling] Target user not found: ${data.targetUserId}`);
      socket.emit('call-error', { 
        error: 'User not available',
        targetUserId: data.targetUserId
      });
      return;
    }
    
    logger.info(`[Signaling] Sending incoming-call to ${targetUser.id} (socket: ${targetUser.socketId})`);
    
    // Send incoming call notification to target user
    io.to(targetUser.socketId).emit('incoming-call', {
      callerId: socket.userId,
      callerName: socket.userName,
      callType: data.callType,
      roomId: data.roomId || `room-${socket.userId}-${data.targetUserId}-${Date.now()}`,
      callId: data.callId
    });
    
    // Notify caller that call is initiated
    socket.emit('call-initiated', {
      targetUserId: data.targetUserId,
      status: 'ringing'
    });
  });
  
  // Handle WebRTC signaling for guest-to-guest calls
  socket.on('offer', (data) => {
    logger.info(`[Signaling] offer event - from: ${socket.userId}, to: ${data.to || data.targetUserId}`);
    
    // Find target socket
    const targetUserId = data.to || data.targetUserId;
    const targetUser = guestUsers.get(targetUserId);
    
    if (targetUser) {
      logger.info(`[Signaling] Forwarding offer to ${targetUserId} (socket: ${targetUser.socketId})`);
      io.to(targetUser.socketId).emit('offer', {
        from: socket.userId,
        userId: socket.userId,
        sdp: data.sdp,
        offer: data.offer
      });
    } else {
      logger.error(`[Signaling] Target user not found for offer: ${targetUserId}`);
      socket.emit('call-error', { error: 'Target user not found' });
    }
  });

  socket.on('answer', (data) => {
    logger.info(`[Signaling] answer event - from: ${socket.userId}, to: ${data.to || data.targetUserId}`);
    
    // Find target socket
    const targetUserId = data.to || data.targetUserId;
    const targetUser = guestUsers.get(targetUserId);
    
    if (targetUser) {
      logger.info(`[Signaling] Forwarding answer to ${targetUserId} (socket: ${targetUser.socketId})`);
      io.to(targetUser.socketId).emit('answer', {
        from: socket.userId,
        userId: socket.userId,
        sdp: data.sdp,
        answer: data.answer
      });
    } else {
      logger.error(`[Signaling] Target user not found for answer: ${targetUserId}`);
      socket.emit('call-error', { error: 'Target user not found' });
    }
  });

  socket.on('ice-candidate', (data) => {
    logger.info(`[Signaling] ice-candidate event - from: ${socket.userId}, to: ${data.to || data.targetUserId}`);
    
    // Find target socket
    const targetUserId = data.to || data.targetUserId;
    const targetUser = guestUsers.get(targetUserId);
    
    if (targetUser) {
      logger.info(`[Signaling] Forwarding ice-candidate to ${targetUserId} (socket: ${targetUser.socketId})`);
      io.to(targetUser.socketId).emit('ice-candidate', {
        from: socket.userId,
        userId: socket.userId,
        candidate: data.candidate,
        sdpMid: data.sdpMid,
        sdpMLineIndex: data.sdpMLineIndex
      });
    } else {
      logger.error(`[Signaling] Target user not found for ice-candidate: ${targetUserId}`);
    }
  });

  // Handle ping/pong for connection monitoring
  socket.on('pong', async (data) => {
    if (socket.isGuest) {
      await guestConnectionManager.handlePongResponse(socket.id, data);
    }
  });
  
  // Handle heartbeat
  socket.on('heartbeat', async (data) => {
    if (socket.isGuest) {
      await guestConnectionManager.updateHeartbeat(socket.id);
    }
  });

  // Handle chat messages
  socket.on('send-message', (message) => {
    if (socket.roomId) {
      io.to(socket.roomId).emit('chat-message', {
        userId: socket.userId,
        userName: socket.userName,
        message,
        timestamp: new Date()
      });
    }
  });

  // Handle user actions
  socket.on('toggle-audio', (isEnabled) => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit('user-audio-toggle', {
        userId: socket.userId,
        isEnabled
      });
    }
  });

  socket.on('toggle-video', (isEnabled) => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit('user-video-toggle', {
        userId: socket.userId,
        isEnabled
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    // Handle guest disconnection
    if (socket.isGuest) {
      // GuestConnectionManager로 연결 해제 처리 위임
      try {
        await guestConnectionManager.unregisterGuest(socket.id, 'disconnect');
      } catch (error) {
        logger.error('Failed to unregister guest from connection manager:', error);
      }
      
      // 기존 로직도 유지 (중복 방지를 위해 try-catch 사용)
      try {
        guestUsers.delete(socket.userId);
      } catch (error) {
        logger.error(`Error removing guest from local map: ${error}`);
      }
    }
    
    if (socket.roomId) {
      // Notify others in the room
      socket.to(socket.roomId).emit('user-left', {
        userId: socket.userId,
        userName: socket.userName
      });

      logger.info(`User ${socket.userId} left room ${socket.roomId}`);
    }
    logger.info(`User disconnected: ${socket.userId}`);
  });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3004;
  server.listen(PORT, () => {
    logger.info(`Signaling service listening on port ${PORT}`);
  });
}

module.exports = app;
