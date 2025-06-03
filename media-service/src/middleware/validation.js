const { AppError } = require('../utils/error');

const validateMediaUpload = (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return next(new AppError('No files were uploaded.', 400));
  }

  const allowedTypes = ['audio/webm', 'video/webm', 'audio/mp4', 'video/mp4'];
  const file = req.files.media;

  if (!allowedTypes.includes(file.mimetype)) {
    return next(new AppError('Invalid file type. Only webm and mp4 files are allowed.', 400));
  }

  next();
};

const validateMediaDelete = (req, res, next) => {
  if (!req.params.id) {
    return next(new AppError('Media ID is required.', 400));
  }
  next();
};

const validateStreamInitiation = (req, res, next) => {
  const { callId, type } = req.body;
  if (!callId || !type) {
    return next(new AppError('callId and type are required.', 400));
  }
  if (!['audio', 'video', 'screen'].includes(type)) {
    return next(new AppError('Invalid type. Must be audio, video, or screen.', 400));
  }
  next();
};

module.exports = {
  validateMediaUpload,
  validateMediaDelete,
  validateStreamInitiation
}; 