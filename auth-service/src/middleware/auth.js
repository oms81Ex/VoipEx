const jwt = require('jsonwebtoken');
const { createError } = require('../utils/error');
const User = require('../models/user');

exports.protect = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError(401, 'No token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      throw createError(401, 'User no longer exists');
    }

    // Check if user is active
    if (!user.isActive) {
      throw createError(403, 'User account is disabled');
    }

    // Grant access to protected route
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(createError(401, 'Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(createError(401, 'Token expired'));
    } else {
      next(error);
    }
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(createError(403, 'You do not have permission to perform this action'));
    }
    next();
  };
}; 