const { pool } = require('../config/database');
const AWS = require('aws-sdk');

// Initialize AWS S3 with error handling
let s3 = null;

const initializeS3 = () => {
  if (!s3) {
    // Check if AWS environment variables are available
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

// @desc    Get user's transcription history
// @route   GET /api/transcriptions
// @access  Private
const getTranscriptionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const search = req.query.search;

    let query = `
      SELECT 
        id,
        original_filename as fileName,
        file_size as fileSize,
        transcription_text as text,
        duration as audioLength,
        status,
        language,
        confidence_score,
        word_count,
        request_id,
        created_at as createdAt,
        updated_at as updatedAt
      FROM transcriptions 
      WHERE user_id = ?
    `;
    let queryParams = [userId];

    // Add status filter
    if (status && status !== 'all') {
      query += ' AND status = ?';
      queryParams.push(status);
    }

    // Add search filter
    if (search) {
      query += ' AND (original_filename LIKE ? OR transcription_text LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    let transcriptions;
    try {
      [transcriptions] = await pool.execute(query, queryParams);
    } catch (dbError) {
      console.error('Database query error:', dbError);
      throw new Error(`Database query failed: ${dbError.message}`);
    }

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM transcriptions WHERE user_id = ?';
    let countParams = [userId];
    
    if (status && status !== 'all') {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    if (search) {
      countQuery += ' AND (original_filename LIKE ? OR transcription_text LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    let countResult;
    let total;
    try {
      [countResult] = await pool.execute(countQuery, countParams);
      total = countResult[0].total;
    } catch (dbError) {
      console.error('Database count query error:', dbError);
      throw new Error(`Database count query failed: ${dbError.message}`);
    }

    // Get statistics
    let statsResult;
    try {
      [statsResult] = await pool.execute(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
         FROM transcriptions 
         WHERE user_id = ?`,
        [userId]
      );
    } catch (dbError) {
      console.error('Database stats query error:', dbError);
      throw new Error(`Database stats query failed: ${dbError.message}`);
    }

    // Format the response data with S3 transcription text
    const formattedTranscriptions = await Promise.all(transcriptions.map(async (transcription) => {
      const createdAt = new Date(transcription.createdAt);
      const updatedAt = new Date(transcription.updatedAt);
      
      let transcriptionText = transcription.text;
      let confidenceScore = transcription.confidence_score || 0;
      let wordCount = transcription.word_count || 0;
      
      // If no transcription text in database, try to get it from S3
      if (!transcriptionText || transcriptionText === 'No transcription available') {
        // Check if request_id exists before trying to get from S3
        if (transcription.request_id) {
          const s3Data = await getTranscriptionFromS3(transcription.request_id);
          if (s3Data) {
            transcriptionText = s3Data.text;
            confidenceScore = s3Data.confidence;
            wordCount = s3Data.wordCount;
            
            // Update the database with the S3 data
            try {
              await pool.execute(
                `UPDATE transcriptions 
                 SET transcription_text = ?, 
                     confidence_score = ?, 
                     word_count = ? 
                 WHERE id = ?`,
                [transcriptionText, confidenceScore, wordCount, transcription.id]
              );
            } catch (updateError) {
              console.error('Error updating transcription with S3 data:', updateError);
            }
          }
        } else {
          console.log(`⚠️ No request_id found for transcription ${transcription.id}, skipping S3 lookup`);
        }
      }
      
      return {
        id: transcription.id.toString(),
        date: createdAt.toISOString().split('T')[0],
        time: createdAt.toTimeString().split(' ')[0].substring(0, 5),
        text: transcriptionText || 'No transcription available',
        audioLength: transcription.audioLength || '0:00',
        status: transcription.status,
        fileName: transcription.fileName,
        fileSize: formatFileSize(transcription.fileSize || 0),
        language: transcription.language || 'en',
        confidenceScore: confidenceScore,
        wordCount: wordCount,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString()
      };
    }));

    res.json({
      success: true,
      data: {
        transcriptions: formattedTranscriptions,
        statistics: {
          total: statsResult[0].total,
          completed: statsResult[0].completed,
          processing: statsResult[0].processing,
          failed: statsResult[0].failed
        },
        pagination: {
          current_page: page,
          per_page: limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get transcription history error:', error);
    
    // Log more details for debugging
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      sqlMessage: error.sqlMessage
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { 
        details: error.message,
        code: error.code 
      })
    });
  }
};

// @desc    Get transcription statistics
// @route   GET /api/transcriptions/stats
// @access  Private
const getTranscriptionStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [statsResult] = await pool.execute(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
       FROM transcriptions 
       WHERE user_id = ?`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        statistics: {
          total: statsResult[0].total,
          completed: statsResult[0].completed,
          processing: statsResult[0].processing,
          failed: statsResult[0].failed
        }
      }
    });

  } catch (error) {
    console.error('Get transcription stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Refresh transcription from S3
// @route   POST /api/transcriptions/:id/refresh
// @access  Private
const refreshTranscriptionFromS3 = async (req, res) => {
  try {
    const userId = req.user.id;
    const transcriptionId = req.params.id;

    // Check if transcription exists and belongs to user
    const [transcriptions] = await pool.execute(
      'SELECT id, request_id, original_filename FROM transcriptions WHERE id = ? AND user_id = ?',
      [transcriptionId, userId]
    );

    if (transcriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transcription not found'
      });
    }

    const transcription = transcriptions[0];

    // Get transcription data from S3
    const s3Data = await getTranscriptionFromS3(transcription.request_id);
    
    if (s3Data) {
      // Update the database with S3 data
      await pool.execute(
        `UPDATE transcriptions 
         SET transcription_text = ?, 
             confidence_score = ?, 
             word_count = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [s3Data.text, s3Data.confidence, s3Data.wordCount, transcriptionId]
      );

      res.json({
        success: true,
        message: 'Transcription refreshed from S3 successfully',
        data: {
          text: s3Data.text,
          confidence: s3Data.confidence,
          wordCount: s3Data.wordCount
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'No transcription data found in S3'
      });
    }

  } catch (error) {
    console.error('Refresh transcription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Delete transcription
// @route   DELETE /api/transcriptions/:id
// @access  Private
const deleteTranscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const transcriptionId = req.params.id;

    // Check if transcription exists and belongs to user
    const [files] = await pool.execute(
      'SELECT id, original_filename, file_path FROM transcriptions WHERE id = ? AND user_id = ?',
      [transcriptionId, userId]
    );

    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transcription not found'
      });
    }

    const file = files[0];

    // Delete file from filesystem
    const fs = require('fs').promises;
    try {
      await fs.unlink(file.file_path);
    } catch (unlinkError) {
      console.error('Error deleting file from filesystem:', unlinkError);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await pool.execute(
      'DELETE FROM transcriptions WHERE id = ? AND user_id = ?',
      [transcriptionId, userId]
    );

    res.json({
      success: true,
      message: 'Transcription deleted successfully'
    });

  } catch (error) {
    console.error('Delete transcription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Helper function to read S3 JSON file and extract transcription text
const getTranscriptionFromS3 = async (requestId) => {
  try {
    if (!requestId) return null;
    
    // Initialize S3 if not already done
    const s3Instance = initializeS3();
    if (!s3Instance) {
      console.log('⚠️ S3 not available, skipping S3 read');
      return null;
    }
    
    const fileName = `JSON-${requestId}.json`;
    const filePath = `${requestId}/${fileName}`;
    
    console.log(`🔍 Reading S3 file: ${filePath}`);
    
    const params = {
      Bucket: process.env.AWS_BUCKET,
      Key: filePath
    };
    
    const data = await s3Instance.getObject(params).promise();
    const jsonData = JSON.parse(data.Body.toString());
    
    // Extract transcription text from Deepgram response
    if (jsonData.results && 
        jsonData.results.channels && 
        jsonData.results.channels[0] && 
        jsonData.results.channels[0].alternatives && 
        jsonData.results.channels[0].alternatives[0]) {
      
      const alternative = jsonData.results.channels[0].alternatives[0];
      return {
        text: alternative.transcript || '',
        confidence: alternative.confidence || 0,
        wordCount: (alternative.transcript || '').split(' ').filter(word => word.length > 0).length
      };
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Error reading S3 file for request_id ${requestId}:`, error.message);
    return null;
  }
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

module.exports = {
  getTranscriptionHistory,
  getTranscriptionStats,
  deleteTranscription,
  refreshTranscriptionFromS3
}; 