const { v4: uuidv4 } = require('uuid');
const Stream = require('../models/stream');
const WebRTCService = require('../services/webrtc.service');
const recordingService = require('../services/recording.service');
const { createError } = require('../utils/error');
const logger = require('../utils/logger');

// Initialize media stream
exports.initializeStream = async (req, res, next) => {
  try {
    const { callId, type } = req.body;
    
    const stream = await Stream.create({
      streamId: uuidv4(),
      callId,
      userId: req.user.id,
      type
    });

    logger.info(`Stream initialized: ${stream.streamId} by user: ${req.user.id}`);
    
    res.status(201).json({
      status: 'success',
      data: { stream }
    });
  } catch (error) {
    next(error);
  }
};

// Get WebRTC capabilities
exports.getRouterCapabilities = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const room = await WebRTCService.createRoom(roomId);
    
    res.json({
      status: 'success',
      data: {
        routerRtpCapabilities: room.router.rtpCapabilities
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create WebRTC transport
exports.createTransport = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const transport = await WebRTCService.createWebRtcTransport(roomId, req.user.id);
    
    res.json({
      status: 'success',
      data: { transport }
    });
  } catch (error) {
    next(error);
  }
};

// Connect transport
exports.connectTransport = async (req, res, next) => {
  try {
    const { roomId, transportId } = req.params;
    const { dtlsParameters } = req.body;
    
    await WebRTCService.connectTransport(roomId, transportId, dtlsParameters);
    
    res.json({
      status: 'success',
      message: 'Transport connected successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Start recording
exports.startRecording = async (req, res, next) => {
  try {
    const { streamId } = req.params;
    
    const stream = await Stream.findOne({ streamId });
    if (!stream) {
      throw createError(404, 'Stream not found');
    }

    if (stream.recording.enabled) {
      throw createError(400, 'Recording already in progress');
    }

    const recording = await recordingService.startRecording(
      streamId,
      stream.callId,
      req.user.id
    );

    res.json({
      status: 'success',
      data: { recording }
    });
  } catch (error) {
    next(error);
  }
};

// Stop recording
exports.stopRecording = async (req, res, next) => {
  try {
    const { streamId } = req.params;
    
    const stream = await Stream.findOne({ streamId });
    if (!stream) {
      throw createError(404, 'Stream not found');
    }

    if (!stream.recording.enabled) {
      throw createError(400, 'No recording in progress');
    }

    const result = await recordingService.stopRecording(streamId);

    res.json({
      status: 'success',
      data: { result }
    });
  } catch (error) {
    next(error);
  }
};

// Update stream quality
exports.updateStreamQuality = async (req, res, next) => {
  try {
    const { streamId } = req.params;
    const { packetLoss, jitter, roundTripTime } = req.body;

    const stream = await Stream.findOneAndUpdate(
      { streamId },
      {
        $set: {
          'quality.packetLoss': packetLoss,
          'quality.jitter': jitter,
          'quality.roundTripTime': roundTripTime
        }
      },
      { new: true }
    );

    if (!stream) {
      throw createError(404, 'Stream not found');
    }

    res.json({
      status: 'success',
      data: { stream }
    });
  } catch (error) {
    next(error);
  }
};

// End stream
exports.endStream = async (req, res, next) => {
  try {
    const { streamId } = req.params;

    const stream = await Stream.findOneAndUpdate(
      { streamId },
      {
        $set: {
          status: 'ended',
          endTime: new Date()
        }
      },
      { new: true }
    );

    if (!stream) {
      throw createError(404, 'Stream not found');
    }

    if (stream.recording.enabled) {
      await recordingService.stopRecording(streamId);
    }

    res.json({
      status: 'success',
      data: { stream }
    });
  } catch (error) {
    next(error);
  }
}; 