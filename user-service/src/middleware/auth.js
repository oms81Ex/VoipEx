const jwt = require('jsonwebtoken');
const { createError } = require('../utils/error');
const axios = require('axios');
const logger = require('../utils/logger');

exports.protect = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError(401, 'No token provided');
    }

    const token = authHeader.split(' ')[1];

    try {
      // Verify token with auth service
      const response = await axios.get(process.env.AUTH_SERVICE_URL + '/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });

      req.user = response.data.user;
      // guest도 허용
      if (req.user.role === 'guest' || req.user.role === 'user' || req.user.role === 'admin') {
        return next();
      }
      throw createError(403, 'Not allowed');
    } catch (error) {
      if (error.response) {
        throw createError(error.response.status, error.response.data.message);
      }
      throw error;
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    next(error);
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