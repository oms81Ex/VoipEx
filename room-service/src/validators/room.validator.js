const Joi = require('joi');

const createRoomSchema = Joi.object({
  name: Joi.string().min(3).max(50).trim(),
  hostName: Joi.string().min(2).max(30).trim(),
  maxParticipants: Joi.number().integer().min(2).max(50).default(10),
  isPrivate: Joi.boolean().default(false),
  password: Joi.when('isPrivate', {
    is: true,
    then: Joi.string().min(4).max(30).required(),
    otherwise: Joi.string().allow(null, '')
  })
});

const joinRoomSchema = Joi.object({
  roomId: Joi.string().required(),
  userName: Joi.string().min(2).max(30).trim(),
  password: Joi.string().allow(null, '')
});

const leaveRoomSchema = Joi.object({
  userId: Joi.string().required()
});

module.exports = {
  createRoomSchema,
  joinRoomSchema,
  leaveRoomSchema
}; 