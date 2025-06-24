const { pool } = require('../config/database');

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await pool.execute(
      `SELECT 
         u.id, u.name, u.email, u.phone_number, u.language, u.is_premium,
         u.created_at, u.updated_at,
         s.plan_type, s.status as subscription_status
       FROM users u
       LEFT JOIN subscriptions s ON u.id = s.user_id
       WHERE u.id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone_number: user.phone_number,
          language: user.language,
          is_premium: user.is_premium,
          subscription: {
            plan_type: user.plan_type,
            status: user.subscription_status
          },
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone_number, language } = req.body;

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (phone_number !== undefined) {
      updateFields.push('phone_number = ?');
      updateValues.push(phone_number);
    }
    if (language !== undefined) {
      updateFields.push('language = ?');
      updateValues.push(language);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updateValues.push(userId);

    await pool.execute(
      `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      updateValues
    );

    // Get updated user data
    const [users] = await pool.execute(
      'SELECT id, name, email, phone_number, language, is_premium FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: users[0]
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private
const getStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get total files uploaded
    const [totalFiles] = await pool.execute(
      'SELECT COUNT(*) as total FROM audio_files WHERE user_id = ?',
      [userId]
    );

    // Get files by status
    const [filesByStatus] = await pool.execute(
      `SELECT 
         status,
         COUNT(*) as count
       FROM audio_files 
       WHERE user_id = ? 
       GROUP BY status`,
      [userId]
    );

    // Get total file size
    const [totalSize] = await pool.execute(
      'SELECT COALESCE(SUM(file_size), 0) as total_size FROM audio_files WHERE user_id = ?',
      [userId]
    );

    // Get recent activity (last 30 days)
    const [recentActivity] = await pool.execute(
      `SELECT 
         DATE(created_at) as date,
         COUNT(*) as files_uploaded
       FROM audio_files 
       WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        stats: {
          total_files: totalFiles[0].total,
          files_by_status: filesByStatus,
          total_size_bytes: totalSize[0].total_size,
          recent_activity: recentActivity
        }
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Delete user account
// @route   DELETE /api/users/account
// @access  Private
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Delete user (cascade will handle related records)
    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getStats,
  deleteAccount
};