const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  avatar: {
    type: String,
    default: null
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  language: {
    type: String,
    default: 'en'
  },
  notifications: {
    email: {
      enabled: { type: Boolean, default: true },
      types: [{
        type: String,
        enum: ['call', 'message', 'system'],
        default: ['call', 'message', 'system']
      }]
    },
    push: {
      enabled: { type: Boolean, default: true },
      types: [{
        type: String,
        enum: ['call', 'message', 'system'],
        default: ['call', 'message', 'system']
      }]
    }
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    audioInput: {
      deviceId: { type: String, default: 'default' },
      autoGainControl: { type: Boolean, default: true },
      echoCancellation: { type: Boolean, default: true },
      noiseSuppression: { type: Boolean, default: true }
    },
    videoInput: {
      deviceId: { type: String, default: 'default' },
      quality: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      }
    },
    audioOutput: {
      deviceId: { type: String, default: 'default' }
    }
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'busy', 'away'],
    default: 'offline'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
profileSchema.index({ userId: 1 });
profileSchema.index({ email: 1 });
profileSchema.index({ status: 1 });

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile; 