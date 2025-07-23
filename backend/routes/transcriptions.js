const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getTranscriptionHistory,
  getTranscriptionStats,
  deleteTranscription
} = require('../controllers/transcriptionController');

// All routes are protected
router.use(authenticateToken);

// @route   GET /api/transcriptions
// @desc    Get user's transcription history
// @access  Private
router.get('/', getTranscriptionHistory);

// @route   GET /api/transcriptions/stats
// @desc    Get transcription statistics
// @access  Private
router.get('/stats', getTranscriptionStats);

// @route   DELETE /api/transcriptions/:id
// @desc    Delete transcription
// @access  Private
router.delete('/:id', deleteTranscription);

module.exports = router; 