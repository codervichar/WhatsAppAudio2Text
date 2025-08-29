const { pool } = require('../config/database');
const Language = require('../models/language');
const Country = require('../models/country');
const bcrypt = require('bcryptjs');

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await pool.execute(
      `SELECT 
         u.id, u.first_name, u.last_name, u.email, u.phone_number, u.country_code, u.wtp_number, u.wa_language,
         u.is_subscribed, u.total_minutes, u.used_minutes,
         u.created_at, u.updated_at,
         s.plan, s.type, s.subscription_minutes, s.used_minutes as sub_used_minutes, s.status
       FROM users u
       LEFT JOIN (
         SELECT s1.*
         FROM subscriptions s1
         WHERE s1.status IN ('active', 'canceling')
         AND s1.user_id = ?
         ORDER BY 
           CASE WHEN s1.plan != 'free' THEN 1 ELSE 2 END,
           s1.created_at DESC
         LIMIT 1
       ) s ON u.id = s.user_id
       WHERE u.id = ?`,
      [userId, userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];

    // Determine plan and minutes left
    let plan_type = user.plan || 'free';
    let is_paid = plan_type && plan_type.toLowerCase() !== 'free';
    let minutes_left = null;
    if (is_paid && user.subscription_minutes != null && user.sub_used_minutes != null) {
      minutes_left = Math.max(user.subscription_minutes - user.sub_used_minutes, 0);
    } else if (user.total_minutes != null && user.used_minutes != null) {
      minutes_left = Math.max(user.total_minutes - user.used_minutes, 0);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          email: user.email,
          phone_number: user.phone_number,
          country_code: user.country_code,
          wtp_number: user.wtp_number,
          wa_language: user.wa_language,
          is_subscribed: user.is_subscribed,
          subscription: {
            plan: user.plan,
            type: user.type,
            status: user.status,
            subscription_minutes: user.subscription_minutes,
            used_minutes: user.sub_used_minutes,
            user_id: user.user_id // Ensure user_id is included for frontend logic
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
    const { first_name, last_name, email, phone_number, country_code, password } = req.body;

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];

    if (first_name !== undefined) {
      updateFields.push('first_name = ?');
      updateValues.push(first_name);
    }
    if (last_name !== undefined) {
      updateFields.push('last_name = ?');
      updateValues.push(last_name);
    }
    if (email !== undefined) {
      // Check if email is already taken by another user
      const [existingUser] = await pool.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );
      
      if (existingUser.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken'
        });
      }
      
      updateFields.push('email = ?');
      updateValues.push(email);
    }
    if (phone_number !== undefined) {
      updateFields.push('phone_number = ?');
      updateValues.push(phone_number);
    }
    if (country_code !== undefined) {
      updateFields.push('country_code = ?');
      updateValues.push(country_code);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push('password = ?');
      updateValues.push(hashedPassword);
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
      `SELECT 
         u.id, u.first_name, u.last_name, u.email, u.phone_number, u.country_code, u.wtp_number, u.wa_language,
         u.is_subscribed, u.total_minutes, u.used_minutes,
         u.created_at, u.updated_at,
         s.plan, s.type, s.subscription_minutes, s.used_minutes as sub_used_minutes, s.status
       FROM users u
       LEFT JOIN (
         SELECT s1.*
         FROM subscriptions s1
         WHERE s1.status IN ('active', 'canceling')
         AND s1.user_id = ?
         ORDER BY 
           CASE WHEN s1.plan != 'free' THEN 1 ELSE 2 END,
           s1.created_at DESC
         LIMIT 1
       ) s ON u.id = s.user_id
       WHERE u.id = ?`,
      [userId, userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];

    // Determine plan and minutes left
    let plan_type = user.plan || 'free';
    let is_paid = plan_type && plan_type.toLowerCase() !== 'free';
    let minutes_left = null;
    if (is_paid && user.subscription_minutes != null && user.sub_used_minutes != null) {
      minutes_left = Math.max(user.subscription_minutes - user.sub_used_minutes, 0);
    } else if (user.total_minutes != null && user.used_minutes != null) {
      minutes_left = Math.max(user.total_minutes - user.used_minutes, 0);
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          email: user.email,
          phone_number: user.phone_number,
          country_code: user.country_code,
          wtp_number: user.wtp_number,
          wa_language: user.wa_language,
          is_subscribed: user.is_subscribed,
          subscription: {
            plan: user.plan,
            type: user.type,
            status: user.status,
            subscription_minutes: user.subscription_minutes,
            used_minutes: user.sub_used_minutes,
            user_id: user.user_id
          },
          created_at: user.created_at,
          updated_at: user.updated_at
        }
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

// @desc    Get all languages
// @route   GET /api/users/languages
// @access  Public
const getLanguages = async (req, res) => {
  try {
    const languages = await Language.getAll();
    res.json({ success: true, data: languages });
  } catch (error) {
    console.error('Get languages error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// @desc    Get all countries
// @route   GET /api/users/countries
// @access  Public
const getCountries = async (req, res) => {
  try {
    const countries = await Country.getAll();
    res.json({ success: true, data: countries });
  } catch (error) {
    console.error('Get countries error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// @desc    Update WhatsApp transcript info and profile fields
// @route   POST /api/users/update-profile
// @access  Private
const updateWhatsAppTranscript = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone_number, password, country_code, wtp_number, wa_language } = req.body;

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
    if (country_code !== undefined) {
      updateFields.push('country_code = ?');
      updateValues.push(country_code);
    }
    if (wtp_number !== undefined) {
      updateFields.push('wtp_number = ?');
      updateValues.push(wtp_number);
    }
    if (wa_language !== undefined) {
      updateFields.push('wa_language = ?');
      updateValues.push(wa_language);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push('password = ?');
      updateValues.push(hashedPassword);
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

    res.json({
      success: true,
      message: 'Profile updated successfully.'
    });
  } catch (error) {
    console.error('Update WhatsApp transcript/profile error:', error);
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
  deleteAccount,
  getLanguages,
  getCountries,
  updateWhatsAppTranscript
};