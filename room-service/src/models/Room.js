const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['host', 'participant'],
    default: 'participant'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  isConnected: {
    type: Boolean,
    default: true
  }
});

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  shortCode: {
    type: String,
    required: true,
    unique: true,
    length: 6
  },
  hostId: {
    type: String,
    required: true
  },
  maxParticipants: {
    type: Number,
    default: 10,
    min: 2,
    max: 50
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    select: false
  },
  participants: [participantSchema],
  settings: {
    allowScreenShare: {
      type: Boolean,
      default: true
    },
    muteOnEntry: {
      type: Boolean,
      default: false
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    chatEnabled: {
      type: Boolean,
      default: true
    }
  },
  status: {
    type: String,
    enum: ['active', 'ended', 'scheduled'],
    default: 'active'
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
roomSchema.index({ shortCode: 1 });
roomSchema.index({ hostId: 1 });
roomSchema.index({ status: 1 });
roomSchema.index({ createdAt: 1 });

// Methods
roomSchema.methods.addParticipant = function(participant) {
  if (this.participants.length >= this.maxParticipants) {
    throw new Error('Room is full');
  }
  this.participants.push(participant);
  return this.save();
};

roomSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(p => p.userId !== userId);
  return this.save();
};

roomSchema.methods.isHost = function(userId) {
  return this.hostId === userId;
};

const Room = mongoose.model('Room', roomSchema);

module.exports = Room; 