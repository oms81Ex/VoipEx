const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/error');

const protect = async (req, res, next) => {
  try {
    // 1) Get token from header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('You are not logged in. Please log in to get access.', 401));
    }

    // 2) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3) Add user info to request
    req.user = {
      id: decoded.id,
      role: decoded.role
    };
    // guest도 허용
    if (req.user.role === 'guest' || req.user.role === 'user' || req.user.role === 'admin') {
      return next();
    }
    return next(new AppError('Not allowed', 403));
  } catch (error) {
    next(new AppError('Invalid token. Please log in again.', 401));
  }
};

module.exports = {
  protect
}; 