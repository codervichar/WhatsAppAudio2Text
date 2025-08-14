const Joi = require('joi');

// User registration validation
const validateRegistration = (req, res, next) => {
  const schema = Joi.object({
    first_name: Joi.string().min(2).max(50).required(),
    last_name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    phone_number: Joi.string().pattern(/^[\+]?[0-9]{7,15}$/).optional(),
    wtp_number: Joi.string().pattern(/^[0-9]{7,15}$/).optional(),
    password: Joi.string().min(6).max(128).required(),
    language: Joi.string().valid(
      'ar', 'az', 'zh', 'zh-TW', 'da', 'de', 'el', 
      'en', 'es', 'fa', 'fr', 'he', 'id', 'it', 
      'ja', 'nl', 'no', 'pt_BR', 'ru', 'sv', 'th', 'tr', 'uk'
    ).default('en'),
    country_id: Joi.number().integer().positive().optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details[0].message
    });
  }
  next();
};

// User login validation
const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details[0].message
    });
  }
  next();
};

// Refresh token validation
const validateRefreshToken = (req, res, next) => {
  const schema = Joi.object({
    refreshToken: Joi.string().required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details[0].message
    });
  }
  next();
};

// File upload validation
const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  // Check file type
  const allowedMimeTypes = [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 
    'audio/m4a', 'audio/aac', 'audio/flac'
  ];

  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type. Only audio files are allowed.'
    });
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (req.file.size > maxSize) {
    return res.status(400).json({
      success: false,
      message: 'File size too large. Maximum size is 10MB.'
    });
  }

  next();
};

// Profile update validation
const validateProfileUpdate = (req, res, next) => {
  const schema = Joi.object({
    first_name: Joi.string().min(2).max(50).optional(),
    last_name: Joi.string().min(2).max(50).optional(),
    email: Joi.string().email().optional(),
    phone_number: Joi.string().pattern(/^[\+]?[0-9]{7,15}$/).optional(),
    country_code: Joi.number().integer().positive().optional(),
    password: Joi.string().min(6).max(128).optional(),
    language: Joi.string().valid(
      'ar', 'az', 'zh', 'zh-TW', 'da', 'de', 'el', 
      'en', 'es', 'fa', 'fr', 'he', 'id', 'it', 
      'ja', 'nl', 'no', 'pt_BR', 'ru', 'sv', 'th', 'tr', 'uk'
    ).optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details[0].message
    });
  }
  next();
};

// Password change validation
const validatePasswordChange = (req, res, next) => {
  const schema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).max(128).required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details[0].message
    });
  }
  next();
};

// Forgot password validation
const validateForgotPassword = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details[0].message
    });
  }
  next();
};

// Reset password validation
const validateResetPassword = (req, res, next) => {
  const schema = Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(6).max(128).required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details[0].message
    });
  }
  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateRefreshToken,
  validateFileUpload,
  validateProfileUpdate,
  validatePasswordChange,
  validateForgotPassword,
  validateResetPassword
}; 