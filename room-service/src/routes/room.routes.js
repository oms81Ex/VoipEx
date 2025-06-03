const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Room = require('../models/Room');
const { getRedisClient } = require('../config/redis');
const { AppError } = require('../middleware/errorHandler');
const validate = require('../middleware/validator');
const { createRoomSchema, joinRoomSchema, leaveRoomSchema } = require('../validators/room.validator');
const logger = require('../utils/logger');

const router = express.Router();
const redis = getRedisClient();

// Generate short code
const generateShortCode = () => {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Create room
router.post('/create', validate(createRoomSchema), async (req, res, next) => {
  try {
    const { name, hostName, maxParticipants = 10, isPrivate = false, password } = req.body;
    const hostId = uuidv4();
    const shortCode = generateShortCode();

    const room = new Room({
      name: name || 'New Meeting',
      shortCode,
      hostId,
      maxParticipants,
      isPrivate,
      password,
      participants: [{
        userId: hostId,
        userName: hostName || 'Host',
        role: 'host'
      }]
    });

    await room.save();

    // Cache room data in Redis
    await redis.setex(`room:${room._id}`, 24 * 60 * 60, JSON.stringify({
      id: room._id,
      shortCode,
      hostId,
      status: 'active'
    }));

    logger.info(`Room created: ${room._id}`);

    res.status(201).json({
      status: 'success',
      data: {
        roomId: room._id,
        shortCode,
        hostId,
        joinUrl: `${process.env.BASE_URL || 'http://localhost'}/room/${room._id}`
      }
    });
  } catch (error) {
    next(new AppError(500, 'Failed to create room'));
  }
});

// Join room
router.post('/join', validate(joinRoomSchema), async (req, res, next) => {
  try {
    const { roomId, userName, password } = req.body;
    
    const room = await Room.findById(roomId);
    if (!room) {
      return next(new AppError(404, 'Room not found'));
    }

    if (room.status !== 'active') {
      return next(new AppError(400, 'Room is not active'));
    }

    if (room.isPrivate && room.password !== password) {
      return next(new AppError(401, 'Invalid password'));
    }

    if (room.participants.length >= room.maxParticipants) {
      return next(new AppError(400, 'Room is full'));
    }

    const userId = uuidv4();
    const participant = {
      userId,
      userName: userName || `Guest ${room.participants.length + 1}`,
      role: 'participant'
    };

    await room.addParticipant(participant);

    // Update Redis cache
    await redis.setex(`participant:${userId}`, 24 * 60 * 60, JSON.stringify({
      roomId: room._id,
      ...participant
    }));

    logger.info(`User joined room: ${roomId}, userId: ${userId}`);

    res.status(200).json({
      status: 'success',
      data: {
        roomId: room._id,
        userId,
        userName: participant.userName,
        role: participant.role
      }
    });
  } catch (error) {
    next(new AppError(500, 'Failed to join room'));
  }
});

// Leave room
router.post('/:roomId/leave', validate(leaveRoomSchema), async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    const room = await Room.findById(roomId);
    if (!room) {
      return next(new AppError(404, 'Room not found'));
    }

    await room.removeParticipant(userId);
    await redis.del(`participant:${userId}`);

    // If room is empty and not hosted by the leaving user, end it
    if (room.participants.length === 0 || (room.hostId === userId)) {
      room.status = 'ended';
      room.endTime = new Date();
      await room.save();
      await redis.del(`room:${roomId}`);
      logger.info(`Room ended: ${roomId}`);
    }

    logger.info(`User left room: ${roomId}, userId: ${userId}`);

    res.status(200).json({
      status: 'success',
      message: 'Successfully left the room'
    });
  } catch (error) {
    next(new AppError(500, 'Failed to leave room'));
  }
});

// Get room info
router.get('/:roomId', async (req, res, next) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findById(roomId);
    if (!room) {
      return next(new AppError(404, 'Room not found'));
    }

    res.status(200).json({
      status: 'success',
      data: {
        id: room._id,
        name: room.name,
        shortCode: room.shortCode,
        isPrivate: room.isPrivate,
        maxParticipants: room.maxParticipants,
        participantCount: room.participants.length,
        settings: room.settings,
        status: room.status,
        startTime: room.startTime,
        endTime: room.endTime
      }
    });
  } catch (error) {
    next(new AppError(500, 'Failed to get room information'));
  }
});

module.exports = router; 