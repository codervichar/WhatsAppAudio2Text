const path = require('path');
const fs = require('fs').promises;
const { pool } = require('../config/database');
const { checkUserMinutes, deductMinutesFromSubscription } = require('../utils/subscriptionUtils');

// @desc    Upload audio file for transcription
// @route   POST /api/files/upload
// @access  Private
const uploadFile = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    // Check user's upload limits (free users limited to 5 files per day)
    if (!req.user.is_premium) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const [todayUploads] = await pool.execute(
        'SELECT COUNT(*) as count FROM audio_files WHERE user_id = ? AND DATE(created_at) = DATE(?)',
        [userId, today]
      );

      if (todayUploads[0].count >= 5) {
        // Delete the uploaded file since we're rejecting it
        await fs.unlink(file.path);
        return res.status(403).json({
          success: false,
          message: 'Daily upload limit reached. Upgrade to premium for unlimited uploads.'
        });
      }
    }

    // Get audio duration to check minutes before processing
    let duration = 0;
    try {
      const mm = require('music-metadata');
      const metadata = await mm.parseFile(file.path);
      duration = metadata.format.duration || 0;
    } catch (err) {
      console.log('⚠️ Could not get audio duration, proceeding with 0 duration');
    }

    // Check if user has sufficient minutes before processing
    const minutesCheck = await checkUserMinutes(userId, duration);
    
    if (!minutesCheck.success) {
      // Delete the uploaded file since we're rejecting it
      await fs.unlink(file.path);
      return res.status(403).json({
        success: false,
        message: `Insufficient minutes remaining. You have ${minutesCheck.remaining.toFixed(2)} minutes left but need ${minutesCheck.required.toFixed(2)} minutes for this file. Please upgrade your plan.`
      });
    }

    console.log(`✅ Minutes check passed: ${minutesCheck.remaining.toFixed(2)} minutes remaining, ${minutesCheck.required.toFixed(2)} minutes required`);

    // Save file information to database
    const [result] = await pool.execute(
      `INSERT INTO audio_files 
       (user_id, filename, original_name, file_path, file_size, mime_type, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        file.filename,
        file.originalname,
        file.path,
        file.size,
        file.mimetype,
        'uploaded'
      ]
    );

    const fileId = result.insertId;

    // Create transcription record
    const [transcriptionResult] = await pool.execute(
      `INSERT INTO transcriptions 
       (user_id, audio_file_id, original_filename, file_path, file_size, mime_type, duration, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        fileId,
        file.originalname,
        file.path,
        file.size,
        file.mimetype,
        duration > 0 ? `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}` : '0:00',
        'pending'
      ]
    );

    const transcriptionId = transcriptionResult.insertId;

    // Here you would typically trigger the transcription process
    // For now, we'll simulate it by updating the status to "processing"
    await pool.execute(
      'UPDATE transcriptions SET status = ? WHERE id = ?',
      ['processing', transcriptionId]
    );

    // Deduct minutes immediately since we're processing the file
    if (duration > 0) {
      console.log('💰 Deducting minutes for file upload transcription...');
      const deductionResult = await deductMinutesFromSubscription(userId, duration);
      
      if (deductionResult.success) {
        console.log(`✅ Minutes deducted successfully: ${deductionResult.deducted.toFixed(2)} minutes`);
        console.log(`📊 Remaining minutes: ${deductionResult.remaining.toFixed(2)}`);
      } else {
        console.log(`⚠️ Minute deduction failed: ${deductionResult.message}`);
        // Note: We don't fail the upload here, just log the issue
      }
    }

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        file: {
          id: fileId,
          filename: file.filename,
          original_name: file.originalname,
          file_size: file.size,
          mime_type: file.mimetype,
          status: 'uploaded'
        },
        transcription: {
          id: transcriptionId,
          status: 'processing'
        }
      }
    });

  } catch (error) {
    console.error('File upload error:', error);
    
    // Clean up uploaded file if there was an error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Get user's uploaded files
// @route   GET /api/files
// @access  Private
const getFiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status;

    let query = `
      SELECT id, filename, original_name, file_size, mime_type, 
             transcription, status, created_at, updated_at
      FROM audio_files 
      WHERE user_id = ?
    `;
    let queryParams = [userId];

    if (status) {
      query += ' AND status = ?';
      queryParams.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    const [files] = await pool.execute(query, queryParams);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM audio_files WHERE user_id = ?';
    let countParams = [userId];
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      success: true,
      data: {
        files,
        pagination: {
          current_page: page,
          per_page: limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Get specific file details
// @route   GET /api/files/:id
// @access  Private
const getFileById = async (req, res) => {
  try {
    const userId = req.user.id;
    const fileId = req.params.id;

    const [files] = await pool.execute(
      `SELECT id, filename, original_name, file_size, mime_type, 
              transcription, status, created_at, updated_at
       FROM audio_files 
       WHERE id = ? AND user_id = ?`,
      [fileId, userId]
    );

    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.json({
      success: true,
      data: {
        file: files[0]
      }
    });

  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Delete file
// @route   DELETE /api/files/:id
// @access  Private
const deleteFile = async (req, res) => {
  try {
    const userId = req.user.id;
    const fileId = req.params.id;

    // Get file info first
    const [files] = await pool.execute(
      'SELECT file_path FROM audio_files WHERE id = ? AND user_id = ?',
      [fileId, userId]
    );

    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    const filePath = files[0].file_path;

    // Delete from database
    await pool.execute(
      'DELETE FROM audio_files WHERE id = ? AND user_id = ?',
      [fileId, userId]
    );

    // Delete physical file
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error deleting physical file:', error);
      // Continue even if file deletion fails
    }

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Manually trigger transcription (premium feature)
// @route   POST /api/files/:id/transcribe
// @access  Private (Premium)
const transcribeFile = async (req, res) => {
  try {
    const userId = req.user.id;
    const fileId = req.params.id;

    // Get the transcription record for this file
    const [transcriptions] = await pool.execute(
      'SELECT id, status FROM transcriptions WHERE audio_file_id = ? AND user_id = ?',
      [fileId, userId]
    );

    if (transcriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transcription not found'
      });
    }

    const transcription = transcriptions[0];

    if (transcription.status === 'processing') {
      return res.status(400).json({
        success: false,
        message: 'Transcription is already being processed'
      });
    }

    // Update status to processing
    await pool.execute(
      'UPDATE transcriptions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['processing', transcription.id]
    );

    // Here you would trigger the actual transcription service
    // For simulation, we'll just return success
    res.json({
      success: true,
      message: 'Transcription started successfully'
    });

  } catch (error) {
    console.error('Transcribe file error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Download original audio file
// @route   GET /api/files/:id/download
// @access  Private
const downloadFile = async (req, res) => {
  try {
    const userId = req.user.id;
    const fileId = req.params.id;

    const [files] = await pool.execute(
      'SELECT file_path, original_name FROM audio_files WHERE id = ? AND user_id = ?',
      [fileId, userId]
    );

    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    const file = files[0];

    // Check if file exists
    try {
      await fs.access(file.file_path);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    res.download(file.file_path, file.original_name);

  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  uploadFile,
  getFiles,
  getFileById,
  deleteFile,
  transcribeFile,
  downloadFile
}; 