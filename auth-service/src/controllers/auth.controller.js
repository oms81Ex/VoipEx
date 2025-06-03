const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { createError } = require('../utils/error');
const logger = require('../utils/logger');

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

// Guest 토큰 발급
exports.guest = async (req, res, next) => {
  try {
    const guestId = 'guest_' + Math.random().toString(36).substring(2, 10);
    const guestName = req.body.name || 'Guest_' + Math.floor(Math.random() * 10000);

    const accessToken = jwt.sign(
      { id: guestId, name: guestName, role: 'guest' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

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