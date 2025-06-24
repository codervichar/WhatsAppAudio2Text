const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { 
  validateRegistration, 
  validateLogin, 
  validateRefreshToken,
  validatePasswordChange,
  validateForgotPassword,
  validateResetPassword
} = require('../middleware/validation');

// Import controller functions
const {
  register,
  login,
  refresh,
  logout,
  changePassword,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', validateRegistration, register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateLogin, login);

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', validateRefreshToken, refresh);

// @route   POST /api/auth/logout
// @desc    Logout user (invalidate refresh token)
// @access  Private
router.post('/logout', authenticateToken, logout);

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', authenticateToken, validatePasswordChange, changePassword);

// @route   POST /api/auth/forgot-password
// @desc    Request password reset email
// @access  Public
router.post('/forgot-password', validateForgotPassword, forgotPassword);

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', validateResetPassword, resetPassword);

module.exports = router; 