const { pool } = require('../config/database');

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

    const [transcriptions] = await pool.execute(query, queryParams);

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

    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    // Get statistics
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

    // Format the response data
    const formattedTranscriptions = transcriptions.map(transcription => {
      const createdAt = new Date(transcription.createdAt);
      const updatedAt = new Date(transcription.updatedAt);
      
      return {
        id: transcription.id.toString(),
        date: createdAt.toISOString().split('T')[0],
        time: createdAt.toTimeString().split(' ')[0].substring(0, 5),
        text: transcription.text || 'No transcription available',
        audioLength: transcription.audioLength || '0:00',
        status: transcription.status,
        fileName: transcription.fileName,
        fileSize: formatFileSize(transcription.fileSize || 0),
        language: transcription.language || 'en',
        confidenceScore: transcription.confidence_score || 0,
        wordCount: transcription.word_count || 0,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString()
      };
    });

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
    res.status(500).json({
      success: false,
      message: 'Internal server error'
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
  deleteTranscription
}; 