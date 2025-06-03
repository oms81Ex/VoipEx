const mongoose = require('mongoose');

const streamSchema = new mongoose.Schema({
  streamId: {
    type: String,
    required: true,
    unique: true
  },
  callId: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['audio', 'video', 'screen'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'ended'],
    default: 'active'
  },
  metadata: {
    resolution: {
      width: Number,
      height: Number
    },
    frameRate: Number,
    bitrate: Number,
    codec: String
  },
  recording: {
    enabled: {
      type: Boolean,
      default: false
    },
    startTime: Date,
    endTime: Date,
    fileUrl: String
  },
  quality: {
    packetLoss: Number,
    jitter: Number,
    roundTripTime: Number
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
streamSchema.index({ streamId: 1 });
streamSchema.index({ callId: 1 });
streamSchema.index({ userId: 1 });
streamSchema.index({ startTime: -1 });

const Stream = mongoose.model('Stream', streamSchema);

module.exports = Stream; 