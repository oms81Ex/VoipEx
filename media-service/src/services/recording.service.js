const NodeMediaServer = require('node-media-server');
const ffmpeg = require('ffmpeg-static');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const Stream = require('../models/stream');

const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000,
    mediaroot: './media',
    allow_origin: '*'
  },
  trans: {
    ffmpeg: ffmpeg,
    tasks: [
      {
        app: 'live',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
        dash: true,
        dashFlags: '[f=dash:window_size=3:extra_window_size=5]'
      }
    ]
  }
};

class RecordingService {
  constructor() {
    this.nms = new NodeMediaServer(config);
    this.recordings = new Map();
  }

  initialize() {
    this.nms.run();
    this.setupEventHandlers();
    logger.info('Recording service initialized');
  }

  setupEventHandlers() {
    this.nms.on('prePublish', async (id, StreamPath, args) => {
      logger.info('Stream started', { streamPath: StreamPath });
    });

    this.nms.on('postPublish', async (id, StreamPath, args) => {
      logger.info('Stream published', { streamPath: StreamPath });
    });

    this.nms.on('donePublish', async (id, StreamPath, args) => {
      logger.info('Stream ended', { streamPath: StreamPath });
      await this.handleStreamEnd(StreamPath);
    });
  }

  async startRecording(streamId, callId, userId) {
    try {
      const recordingId = uuidv4();
      const outputPath = `./media/recordings/${recordingId}`;

      const stream = await Stream.findOneAndUpdate(
        { streamId },
        {
          $set: {
            'recording.enabled': true,
            'recording.startTime': new Date(),
            'recording.fileUrl': `${outputPath}.mp4`
          }
        },
        { new: true }
      );

      if (!stream) {
        throw new Error('Stream not found');
      }

      this.recordings.set(streamId, {
        recordingId,
        outputPath,
        startTime: new Date()
      });

      logger.info('Recording started', { streamId, recordingId });

      return {
        recordingId,
        outputPath
      };
    } catch (error) {
      logger.error('Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording(streamId) {
    try {
      const recording = this.recordings.get(streamId);
      if (!recording) {
        throw new Error('Recording not found');
      }

      const stream = await Stream.findOneAndUpdate(
        { streamId },
        {
          $set: {
            'recording.enabled': false,
            'recording.endTime': new Date()
          }
        },
        { new: true }
      );

      if (!stream) {
        throw new Error('Stream not found');
      }

      this.recordings.delete(streamId);

      logger.info('Recording stopped', { streamId, recordingId: recording.recordingId });

      return {
        recordingId: recording.recordingId,
        duration: (new Date() - recording.startTime) / 1000,
        outputPath: recording.outputPath
      };
    } catch (error) {
      logger.error('Failed to stop recording:', error);
      throw error;
    }
  }

  async handleStreamEnd(streamPath) {
    const streamId = this.extractStreamId(streamPath);
    if (this.recordings.has(streamId)) {
      await this.stopRecording(streamId);
    }
  }

  extractStreamId(streamPath) {
    // Extract streamId from RTMP stream path (e.g., '/live/streamId')
    return streamPath.split('/').pop();
  }

  getRecordingStatus(streamId) {
    return this.recordings.has(streamId);
  }

  shutdown() {
    this.nms.stop();
    logger.info('Recording service stopped');
  }
}

module.exports = new RecordingService(); 