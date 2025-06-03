const { body } = require('express-validator');

const validateProfileUpdate = [
  body('name').optional().isString(),
  body('avatar').optional().isString(),
  body('timezone').optional().isString(),
  body('language').optional().isString(),
  (req, res, next) => { next(); }
];

const validateStatusUpdate = [
  body('status').isIn(['online', 'offline', 'busy', 'away']),
  (req, res, next) => { next(); }
];

module.exports = {
  validateProfileUpdate,
  validateStatusUpdate
}; 