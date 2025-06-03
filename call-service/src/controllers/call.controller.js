const Call = require('../models/call');
const { createError } = require('../utils/error');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// Initiate a new call
exports.initiateCall = async (req, res, next) => {
  try {
    const { type, roomId, participants } = req.body;
    
    const call = await Call.create({
      callId: uuidv4(),
      initiator: req.user.id,
      type,
      roomId,
      participants: participants.map(userId => ({
        userId,
        joinedAt: null
      }))
    });

    logger.info(`Call initiated: ${call.callId} by user: ${req.user.id}`);
    
    // Here you would trigger notifications to participants via WebSocket
    
    res.status(201).json({
      status: 'success',
      data: { call }
    });
  } catch (error) {
    next(error);
  }
};

// Join a call
exports.joinCall = async (req, res, next) => {
  try {
    const { callId } = req.params;
    const { deviceInfo } = req.body;

    const call = await Call.findOne({ callId });
    if (!call) {
      throw createError(404, 'Call not found');
    }

    const participant = call.participants.find(p => p.userId === req.user.id);
    if (!participant) {
      throw createError(403, 'Not authorized to join this call');
    }

    participant.joinedAt = new Date();
    participant.deviceInfo = deviceInfo;

    if (call.status === 'initiated') {
      call.status = 'connected';
    }

    await call.save();

    logger.info(`User ${req.user.id} joined call: ${callId}`);

    res.json({
      status: 'success',
      data: { call }
    });
  } catch (error) {
    next(error);
  }
};

// Leave a call
exports.leaveCall = async (req, res, next) => {
  try {
    const { callId } = req.params;

    const call = await Call.findOne({ callId });
    if (!call) {
      throw createError(404, 'Call not found');
    }

    const participant = call.participants.find(p => p.userId === req.user.id);
    if (!participant) {
      throw createError(403, 'Not a participant of this call');
    }

    participant.leftAt = new Date();

    // Check if all participants have left
    const allLeft = call.participants.every(p => p.leftAt);
    if (allLeft) {
      call.status = 'ended';
      call.endTime = new Date();
    }

    await call.save();

    logger.info(`User ${req.user.id} left call: ${callId}`);

    res.json({
      status: 'success',
      data: { call }
    });
  } catch (error) {
    next(error);
  }
};

// Get call details
exports.getCall = async (req, res, next) => {
  try {
    const { callId } = req.params;

    const call = await Call.findOne({ callId });
    if (!call) {
      throw createError(404, 'Call not found');
    }

    res.json({
      status: 'success',
      data: { call }
    });
  } catch (error) {
    next(error);
  }
};

// Update call quality metrics
exports.updateCallQuality = async (req, res, next) => {
  try {
    const { callId } = req.params;
    const { audioQuality, videoQuality, networkQuality } = req.body;

    const call = await Call.findOneAndUpdate(
      { callId },
      {
        $set: {
          'quality.audioQuality': audioQuality,
          'quality.videoQuality': videoQuality,
          'quality.networkQuality': networkQuality
        }
      },
      { new: true }
    );

    if (!call) {
      throw createError(404, 'Call not found');
    }

    logger.info(`Call quality updated for call: ${callId}`);

    res.json({
      status: 'success',
      data: { call }
    });
  } catch (error) {
    next(error);
  }
};

// Get call history for a user
exports.getCallHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const calls = await Call.find({
      'participants.userId': req.user.id
    })
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Call.countDocuments({
      'participants.userId': req.user.id
    });

    res.json({
      status: 'success',
      data: {
        calls,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}; 