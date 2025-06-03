const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  callId: {
    type: String,
    required: true,
    unique: true
  },
  initiator: {
    type: String,
    required: true
  },
  participants: [{
    userId: {
      type: String,
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: {
      type: Date
    },
    deviceInfo: {
      type: Object
    }
  }],
  roomId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['initiated', 'ringing', 'connected', 'ended'],
    default: 'initiated'
  },
  type: {
    type: String,
    enum: ['audio', 'video'],
    required: true
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number,
    default: 0
  },
  quality: {
    audioQuality: {
      type: Number,
      min: 0,
      max: 100
    },
    videoQuality: {
      type: Number,
      min: 0,
      max: 100
    },
    networkQuality: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  metadata: {
    recordingEnabled: {
      type: Boolean,
      default: false
    },
    recordingUrl: String,
    screenSharing: {
      enabled: {
        type: Boolean,
        default: false
      },
      sharedBy: String
    }
  }
}, {
  timestamps: true
});

// Indexes
callSchema.index({ callId: 1 });
callSchema.index({ initiator: 1 });
callSchema.index({ roomId: 1 });
callSchema.index({ startTime: -1 });
callSchema.index({ 'participants.userId': 1 });

// Calculate call duration before saving
callSchema.pre('save', function(next) {
  if (this.endTime && this.startTime) {
    this.duration = Math.floor((this.endTime - this.startTime) / 1000); // Duration in seconds
  }
  next();
});

const Call = mongoose.model('Call', callSchema);

module.exports = Call; 