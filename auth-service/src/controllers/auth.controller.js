const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { createError } = require('../utils/error');
const logger = require('../utils/logger');
const http = require('http');

// Generate tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
};

// Register new user
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw createError(409, 'User already exists');
    }

    // Create new user
    const user = new User({ name, email, password });
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshToken = refreshToken;
    await user.save();

    logger.info(`New user registered: ${email}`);
    res.status(201).json({
      status: 'success',
      data: {
        user,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

// Login user
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      throw createError(401, 'Invalid credentials');
    }

    if (!user.isActive) {
      throw createError(403, 'Account is disabled');
    }

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    logger.info(`User logged in: ${email}`);
    res.json({
      status: 'success',
      data: {
        user,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

// Refresh token
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw createError(400, 'Refresh token is required');
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findOne({ _id: decoded.id, refreshToken });

    if (!user) {
      throw createError(401, 'Invalid refresh token');
    }

    const tokens = generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json({
      status: 'success',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(createError(401, 'Invalid refresh token'));
    } else {
      next(error);
    }
  }
};

// Logout user
exports.logout = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.refreshToken = null;
      await user.save();
    }

    logger.info(`User logged out: ${req.user.email}`);
    res.json({
      status: 'success',
      message: 'Successfully logged out'
    });
  } catch (error) {
    next(error);
  }
};

// Get current user
exports.getCurrentUser = async (req, res, next) => {
  try {
    // Guest 사용자인 경우 DB 조회 없이 토큰 정보 반환
    if (req.user.role === 'guest') {
      res.json({
        status: 'success',
        data: {
          user: {
            _id: req.user.id,
            id: req.user.id,
            name: req.user.name,
            role: req.user.role
          }
        }
      });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      throw createError(404, 'User not found');
    }

    res.json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

// Delete guest user
exports.deleteGuest = async (req, res, next) => {
  try {
    const { guestId } = req.params;
    
    // guest_ 로 시작하는 ID만 삭제 허용
    if (!guestId.startsWith('guest_')) {
      throw createError(403, 'Can only delete guest users');
    }
    
    // auth-service DB에서 삭제
    await User.findByIdAndDelete(guestId);
    
    // user-service에서도 삭제
    try {
      const options = {
        hostname: 'user-service',
        port: 3002,
        path: `/profile/${guestId}`,
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      await new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
          res.on('data', () => {});
          res.on('end', () => resolve());
        });
        req.on('error', reject);
        req.end();
      });
    } catch (syncError) {
      logger.error('Failed to delete guest from user-service:', syncError);
    }
    
    logger.info(`Guest user deleted: ${guestId}`);
    res.json({
      status: 'success',
      message: 'Guest user deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Cleanup all guest users (server startup)
exports.cleanupAllGuests = async (req, res, next) => {
  try {
    // auth-service DB에서 모든 게스트 사용자 삭제
    const result = await User.deleteMany({
      role: 'guest'
    });
    
    logger.info(`Server startup cleanup: Deleted ${result.deletedCount} guest users`);
    
    res.json({
      status: 'success',
      data: {
        deletedCount: result.deletedCount,
        cleanupType: 'server_startup'
      }
    });
  } catch (error) {
    logger.error('Error during server startup guest cleanup:', error);
    next(error);
  }
};

// Cleanup old guest users
exports.cleanupGuests = async (req, res, next) => {
  try {
    const { before } = req.query;
    let cutoffDate;
    
    if (before) {
      cutoffDate = new Date(before);
    } else {
      // 기본값: 24시간 이전
      cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }
    
    // auth-service DB에서 오래된 게스트 유저 삭제
    const result = await User.deleteMany({
      role: 'guest',
      createdAt: { $lt: cutoffDate }
    });
    
    logger.info(`Cleaned up ${result.deletedCount} old guest users (before ${cutoffDate.toISOString()})`);
    
    res.json({
      status: 'success',
      data: {
        deletedCount: result.deletedCount,
        cutoffDate: cutoffDate.toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

// Guest 토큰 발급
exports.guest = async (req, res, next) => {
  try {
    const guestId = 'guest_' + Math.random().toString(36).substring(2, 10);
    const guestName = req.body.name || 'Guest_' + Math.floor(Math.random() * 10000);

    // auth-service DB에 게스트 유저 저장
    const guestUser = new User({
      _id: guestId,
      name: guestName,
      email: `${guestId}@guest.local`,
      password: 'guest-password-' + Math.random().toString(36),
      role: 'guest',
      isActive: true
    });
    
    await guestUser.save();

    const accessToken = jwt.sign(
      { id: guestId, name: guestName, role: 'guest' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // user-service에도 게스트 정보 동기화
    try {
      const postData = JSON.stringify({
        name: guestName,
        email: `${guestId}@guest.local`,
        avatar: 'default.jpg'
      });

      const options = {
        hostname: 'user-service',
        port: 3002,
        path: '/profile/update',
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      await new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
          res.setEncoding('utf8');
          res.on('data', () => {});
          res.on('end', () => resolve());
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
      });
    } catch (syncError) {
      logger.error('Failed to sync guest user to user-service:', syncError);
      // 동기화 실패해도 게스트 생성은 진행
    }

    res.json({
      status: 'success',
      data: {
        user: { id: guestId, name: guestName, role: 'guest' },
        accessToken
      }
    });
  } catch (error) {
    next(error);
  }
}; 