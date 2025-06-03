const Joi = require('joi');
const { createError } = require('../utils/error');

exports.validateCallInitiation = (req, res, next) => {
  const schema = Joi.object({
    type: Joi.string().valid('audio', 'video').required(),
    roomId: Joi.string().required(),
    participants: Joi.array().items(Joi.string()).min(1).required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return next(createError(400, error.details[0].message));
  }

  next();
};

exports.validateQualityUpdate = (req, res, next) => {
  const schema = Joi.object({
    audioQuality: Joi.number().min(0).max(100),
    videoQuality: Joi.number().min(0).max(100),
    networkQuality: Joi.number().min(0).max(100)
  }).min(1);

  const { error } = schema.validate(req.body);
  if (error) {
    return next(createError(400, error.details[0].message));
  }

  next();
}; 