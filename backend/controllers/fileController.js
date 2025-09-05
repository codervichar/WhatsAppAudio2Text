const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
const AWS = require('aws-sdk');
const { pool } = require('../config/database');
const { checkUserMinutes, deductMinutesFromSubscription } = require('../utils/subscriptionUtils');

// Initialize AWS S3
let s3 = null;
const initializeS3 = () => {
  if (!s3) {
    if (!process.env.AWS_KEY || !process.env.AWS_SECRET || !process.env.AWS_REGION || !process.env.AWS_BUCKET) {
      console.warn('⚠️ AWS environment variables not configured. S3 functionality will be disabled.');
      return null;
    }
    
    try {
      s3 = new AWS.S3({
        accessKeyId: process.env.AWS_KEY,
        secretAccessKey: process.env.AWS_SECRET,
        region: process.env.AWS_REGION,
      });
      console.log('✅ AWS S3 initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize AWS S3:', error.message);
      return null;
    }
  }
  return s3;
};

// Deepgram transcription function for file uploads
async function deepgramTranscribeFile(transcriptionId, filePath, language = 'en', speakerIdentification = false) {
  try {
    console.log('🚀 Starting Deepgram transcription for file:', filePath);
    
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error('Deepgram API key not configured');
    }

    // Initialize S3
    const s3Instance = initializeS3();
    if (!s3Instance) {
      throw new Error('S3 not configured');
    }

    // Read the file
    const fileBuffer = await fs.readFile(filePath);
    const fileName = path.basename(filePath);
    
    // Upload to S3
    const s3Key = `transcriptions/${transcriptionId}/${fileName}`;
    await s3Instance.putObject({
      Bucket: process.env.AWS_BUCKET,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: 'audio/mpeg' // Default, could be improved by detecting actual type
    }).promise();
    
    const s3Url = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    console.log('✅ File uploaded to S3:', s3Url);

    // Call Deepgram API
    const callBackUrl = process.env.DEEPGRAM_CALLBACK_URL || `${process.env.APP_URL || 'https://api.voicemessage2text.com'}/api/webhook/deepgram/hook`;
    const apiUrl = 'https://api.deepgram.com/v1/listen';
    
    let queryString = '?model=whisper-large&smart_format=true';
    
    if (speakerIdentification) {
      queryString += '&punctuate=true&paragraphs=true&utterances=true&diarize=true';
    }
    
    if (language && language !== 'en') {
      queryString += `&language=${language}`;
    } else {
      queryString += '&detect_language=true';
    }
    
    queryString += `&callback=${callBackUrl}`;
    
    const fullApiUrl = apiUrl + queryString;
    
    const headers = {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'application/json'
    };
    
    const requestBody = {
      url: s3Url
    };
    
    const response = await axios.post(fullApiUrl, requestBody, { headers });
    
    if (response.data && response.data.request_id) {
      console.log('✅ Deepgram transcription initiated:', response.data.request_id);
      return response.data.request_id;
    } else {
      throw new Error('Deepgram API returned no request_id');
    }
    
  } catch (error) {
    console.error('❌ Deepgram transcription error:', error);
    throw error;
  }
}

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

    // Check if user has sufficient minutes before processing (but don't deduct yet)
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

    // Trigger the actual transcription process
    try {
      // Start transcription immediately after upload
      const requestId = await deepgramTranscribeFile(transcriptionId, file.path, 'en', false);
      
      // Update transcription record with request_id and status
      await pool.execute(
        'UPDATE transcriptions SET status = ?, request_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['processing', requestId, transcriptionId]
      );

      console.log(`✅ Transcription initiated for uploaded file with request_id: ${requestId}`);
      console.log('📝 Minutes will be deducted upon successful completion.');
      
    } catch (transcriptionError) {
      console.error('❌ Failed to start transcription for uploaded file:', transcriptionError);
      
      // Update status to failed
      await pool.execute(
        'UPDATE transcriptions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['failed', transcriptionId]
      );
      
      // Note: We don't fail the upload here, just mark transcription as failed
      // The user can retry transcription later
    }

    // Get the final transcription status
    const [finalTranscription] = await pool.execute(
      'SELECT status, request_id FROM transcriptions WHERE id = ?',
      [transcriptionId]
    );

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
          status: finalTranscription[0]?.status || 'pending',
          request_id: finalTranscription[0]?.request_id || null
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
    const { language = 'en', speakerIdentification = false } = req.body;

    // Get the transcription record and file details
    const [transcriptions] = await pool.execute(
      `SELECT t.id, t.status, t.duration, af.file_path, af.original_name 
       FROM transcriptions t 
       JOIN audio_files af ON t.audio_file_id = af.id 
       WHERE t.audio_file_id = ? AND t.user_id = ?`,
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

    if (transcription.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Transcription is already completed'
      });
    }

    // Check if user has sufficient minutes before processing
    const durationInSeconds = parseDurationToSeconds(transcription.duration);
    const minutesCheck = await checkUserMinutes(userId, durationInSeconds);
    
    if (!minutesCheck.success) {
      return res.status(403).json({
        success: false,
        message: `Insufficient minutes remaining. You have ${minutesCheck.remaining.toFixed(2)} minutes left but need ${minutesCheck.required.toFixed(2)} minutes for this file. Please upgrade your plan.`
      });
    }

    // Update status to processing
    await pool.execute(
      'UPDATE transcriptions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['processing', transcription.id]
    );

    try {
      // Trigger actual transcription with Deepgram
      const requestId = await deepgramTranscribeFile(transcription.id, transcription.file_path, language, speakerIdentification);
      
      // Update transcription record with request_id
      await pool.execute(
        'UPDATE transcriptions SET request_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [requestId, transcription.id]
      );

      console.log(`✅ Transcription initiated for file ${transcription.original_name} with request_id: ${requestId}`);
      
      res.json({
        success: true,
        message: 'Transcription started successfully',
        data: {
          requestId: requestId,
          status: 'processing'
        }
      });

    } catch (transcriptionError) {
      console.error('❌ Failed to start transcription:', transcriptionError);
      
      // Update status to failed
      await pool.execute(
        'UPDATE transcriptions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['failed', transcription.id]
      );

      res.status(500).json({
        success: false,
        message: 'Failed to start transcription. Please try again later.'
      });
    }

  } catch (error) {
    console.error('Transcribe file error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Helper function to parse duration string to seconds
function parseDurationToSeconds(durationStr) {
  if (!durationStr || durationStr === '0:00') return 0;
  
  const parts = durationStr.split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    return minutes * 60 + seconds;
  }
  
  return 0;
}

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