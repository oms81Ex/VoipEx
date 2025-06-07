const Profile = require('../models/profile');
const { createError } = require('../utils/error');
const logger = require('../utils/logger');
const User = require('../models/user.model');

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

    let user = await User.findByIdAndUpdate(
      userId,
      { name, email, avatar },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      // User가 없으면 새로 생성 (guest 등)
      let guestEmail = email;
      if (!guestEmail) {
        guestEmail = `guest_${userId}@guest.local`;
      }
      user = await User.create({ _id: userId, name, email: guestEmail, avatar, role: req.user.role || 'guest', password: 'guest-password' });
      user.password = undefined; // 응답에서 password 제외
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

// 연락처 추가
const addContact = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { contactId } = req.body;
    if (!contactId) {
      return next(createError(400, 'contactId is required'));
    }
    // 본인 유저 찾기
    const user = await User.findById(userId);
    if (!user) {
      return next(createError(404, 'User not found'));
    }
    // 이미 추가된 연락처인지 확인
    if (user.contacts && user.contacts.includes(contactId)) {
      return res.status(200).json({ status: 'success', message: 'Already in contacts' });
    }
    // contacts 배열이 없으면 생성
    if (!user.contacts) user.contacts = [];
    user.contacts.push(contactId);
    await user.save();
    res.status(200).json({ status: 'success', message: 'Contact added', data: { contacts: user.contacts } });
  } catch (error) {
    next(error);
  }
};

// 유저 검색 (이름/이메일 등)
const searchUser = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ status: 'fail', message: 'Query is required' });
    }
    // 이름 또는 이메일로 검색 (User 모델 기준)
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).select('-password');
    res.json({ status: 'success', data: { users } });
  } catch (error) {
    next(error);
  }
};

// Delete user (mainly for guest users)
const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // guest_ 로 시작하는 ID만 삭제 허용 (보안)
    if (!userId.startsWith('guest_')) {
      return res.status(403).json({ 
        status: 'fail', 
        message: 'Can only delete guest users' 
      });
    }
    
    const deletedUser = await User.findByIdAndDelete(userId);
    
    if (!deletedUser) {
      return res.status(404).json({ 
        status: 'fail', 
        message: 'User not found' 
      });
    }
    
    logger.info(`User deleted: ${userId}`);
    res.json({ 
      status: 'success', 
      message: 'User deleted successfully' 
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
  getOnlineUsers,
  addContact,
  searchUser,
  deleteUser
}; 