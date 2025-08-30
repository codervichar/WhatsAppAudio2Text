const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { validateProfileUpdate, validateWhatsAppTranscriptUpdate } = require('../middleware/validation');
const Language = require('../models/language');
const Country = require('../models/country');

// Import controller functions
const {
  getProfile,
  updateProfile,
  getStats,
  deleteAccount,
  getLanguages,
  getCountries,
  updateWhatsAppTranscript
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

// @route   GET /api/users/languages
// @desc    Get all languages
// @access  Public
router.get('/languages', getLanguages);

// @route   GET /api/users/countries
// @desc    Get all countries
// @access  Public
router.get('/countries', getCountries);

// @route   POST /api/users/update-profile
// @desc    Update WhatsApp transcript info (was /whatsapp-transcription)
// @access  Private
router.post('/update-profile', authenticateToken, validateWhatsAppTranscriptUpdate, updateWhatsAppTranscript);

module.exports = router; 