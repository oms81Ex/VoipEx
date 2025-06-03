const Profile = require('../models/profile');
const { createError } = require('../utils/error');
const logger = require('../utils/logger');
const User = require('../models/user.model');
const { AppError } = require('../utils/error');

// Get profile by user ID
const getProfile = async (req, res, next) => {
  try {
    const profile = await Profile.findOne({ userId: req.user.id });
    if (!profile) {
      throw createError(404, 'Profile not found');
    }

    res.json({
      status: 'success',
      data: { profile }
    });
  } catch (error) {
    next(error);
  }
};

// Create or update profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, email, avatar } = req.body;
    const userId = req.user.id;

    const user = await User.findByIdAndUpdate(
      userId,
      { name, email, avatar },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

// Update status
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['online', 'offline', 'busy', 'away'].includes(status)) {
      throw createError(400, 'Invalid status');
    }

    const profile = await Profile.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          status,
          lastSeen: Date.now()
        }
      },
      { new: true }
    );

    if (!profile) {
      throw createError(404, 'Profile not found');
    }

    logger.info(`Status updated for user: ${req.user.id} to ${status}`);
    res.json({
      status: 'success',
      data: { profile }
    });
  } catch (error) {
    next(error);
  }
};

// Update preferences
const updatePreferences = async (req, res, next) => {
  try {
    const { preferences } = req.body;
    const profile = await Profile.findOneAndUpdate(
      { userId: req.user.id },
      { $set: { preferences } },
      { new: true, runValidators: true }
    );

    if (!profile) {
      throw createError(404, 'Profile not found');
    }

    logger.info(`Preferences updated for user: ${req.user.id}`);
    res.json({
      status: 'success',
      data: { profile }
    });
  } catch (error) {
    next(error);
  }
};

// Update notifications settings
const updateNotifications = async (req, res, next) => {
  try {
    const { notifications } = req.body;
    const profile = await Profile.findOneAndUpdate(
      { userId: req.user.id },
      { $set: { notifications } },
      { new: true, runValidators: true }
    );

    if (!profile) {
      throw createError(404, 'Profile not found');
    }

    logger.info(`Notifications settings updated for user: ${req.user.id}`);
    res.json({
      status: 'success',
      data: { profile }
    });
  } catch (error) {
    next(error);
  }
};

// Get online users
const getOnlineUsers = async (req, res, next) => {
  try {
    const onlineUsers = await Profile.find({
      status: 'online'
    }).select('userId name avatar status lastSeen');

    res.json({
      status: 'success',
      data: { users: onlineUsers }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updateStatus,
  updatePreferences,
  updateNotifications,
  getOnlineUsers
}; 