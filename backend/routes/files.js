const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requirePremium } = require('../middleware/auth');
const { validateFileUpload } = require('../middleware/validation');

// Import controller functions
const {
  uploadFile,
  getFiles,
  getFileById,
  deleteFile,
  transcribeFile,
  downloadFile
} = require('../controllers/fileController');

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadDir = process.env.UPLOAD_PATH || './uploads';
const createUploadDir = async () => {
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
};
createUploadDir();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 
      'audio/m4a', 'audio/aac', 'audio/flac'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  }
});

// @route   POST /api/files/upload
// @desc    Upload audio file for transcription
// @access  Private
router.post('/upload', authenticateToken, upload.single('audioFile'), validateFileUpload, uploadFile);

// @route   GET /api/files
// @desc    Get user's uploaded files
// @access  Private
router.get('/', authenticateToken, getFiles);

// @route   GET /api/files/:id
// @desc    Get specific file details
// @access  Private
router.get('/:id', authenticateToken, getFileById);

// @route   DELETE /api/files/:id
// @desc    Delete file
// @access  Private
router.delete('/:id', authenticateToken, deleteFile);

// @route   POST /api/files/:id/transcribe
// @desc    Manually trigger transcription (premium feature)
// @access  Private (Premium)
router.post('/:id/transcribe', authenticateToken, requirePremium, transcribeFile);

// @route   GET /api/files/:id/download
// @desc    Download original audio file
// @access  Private
router.get('/:id/download', authenticateToken, downloadFile);

module.exports = router; 