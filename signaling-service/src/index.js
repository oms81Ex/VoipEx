require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const Redis = require('ioredis');
const logger = require('./utils/logger');

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

// Socket authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key');
    // guest도 허용
    if (decoded.role === 'guest' || decoded.role === 'user' || decoded.role === 'admin') {
      socket.userId = decoded.id || decoded.userId;
      socket.userName = decoded.name || decoded.userName;
      return next();
    }
    return next(new Error('Not allowed'));
  } catch (error) {
    logger.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
});

// Socket connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.userId}`);

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

  // Handle WebRTC signaling
  socket.on('offer', (data) => {
    socket.to(data.targetUserId).emit('offer', {
      offer: data.offer,
      userId: socket.userId
    });
  });

  socket.on('answer', (data) => {
    socket.to(data.targetUserId).emit('answer', {
      answer: data.answer,
      userId: socket.userId
    });
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.targetUserId).emit('ice-candidate', {
      candidate: data.candidate,
      userId: socket.userId
    });
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
