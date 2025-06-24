const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { validateProfileUpdate } = require('../middleware/validation');

// Import controller functions
const {
  getProfile,
  updateProfile,
  getStats,
  deleteAccount
} = require('../controllers/userController');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticateToken, getProfile);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, validateProfileUpdate, updateProfile);

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', authenticateToken, getStats);

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete('/account', authenticateToken, deleteAccount);

module.exports = router; 