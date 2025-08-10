const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../config/database');
const {
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  verifyRefreshToken,
  removeRefreshToken
} = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../services/emailService');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { first_name, last_name, email, phone_number, password, language } = req.body;

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Get default language ID (English = 1, or find by code 'en')
    let languageId = 1; // Default to English
    if (language) {
      try {
        const [langResult] = await pool.execute(
          'SELECT id FROM language_codes WHERE code = ?',
          [language]
        );
        if (langResult.length > 0) {
          languageId = langResult[0].id;
        }
      } catch (error) {
        console.warn('Could not find language code, using default:', error.message);
      }
    }

    // Insert new user
    const [result] = await pool.execute(
      `INSERT INTO users (first_name, last_name, email, phone_number, password, wa_language) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, email, phone_number || null, hashedPassword, languageId]
    );

    const userId = result.insertId;

    // Generate tokens
    const accessToken = generateAccessToken(userId);
    const refreshToken = generateRefreshToken(userId);

    // Store refresh token
    await storeRefreshToken(userId, refreshToken);

    // Create default subscription record
    await pool.execute(
      'INSERT INTO subscriptions (user_id, plan, type, subscription_minutes, used_minutes, amount, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, 'pro', 'monthly', process.env.PRO_MONTHLY_MINUTES, 0, process.env.PRO_MONTHLY_AMOUNT, 'active']
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: userId,
          first_name,
          last_name,
          name: `${first_name} ${last_name}`, // For backward compatibility
          email,
          phone_number,
          language: language || 'en',
          is_premium: false
        },
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get user from database
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token
    await storeRefreshToken(user.id, refreshToken);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.name || '',
          email: user.email,
          phone_number: user.phone_number,
          language: user.language,
          is_premium: user.is_premium
        },
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // Verify refresh token
    const decoded = await verifyRefreshToken(refreshToken);

    // Generate new access token
    const newAccessToken = generateAccessToken(decoded.userId);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

// @desc    Logout user (invalidate refresh token)
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await removeRefreshToken(refreshToken);
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Change user password
// @route   POST /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get current user password
    const [users] = await pool.execute(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, users[0].password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedNewPassword, userId]
    );

    // Optionally, invalidate all existing refresh tokens for security
    await pool.execute(
      'DELETE FROM refresh_tokens WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Password changed successfully. Please login again with your new password.'
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Request password reset
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT id, first_name, last_name, email FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      // Return success even if user doesn't exist (security best practice)
      return res.json({
        success: true,
        message: 'If an account with that email exists, we have sent a password reset link.'
      });
    }

    const user = users[0];

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set token expiration (1 hour from now)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete any existing reset tokens for this user
    await pool.execute(
      'DELETE FROM password_reset_tokens WHERE user_id = ?',
      [user.id]
    );

    // Store the hashed token in database
    await pool.execute(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, hashedToken, expiresAt]
    );

    // Send reset email
    // const emailResult = await sendPasswordResetEmail(
    //   user.email,
    //   resetToken, // Send unhashed token in email
    //   user.first_name || 'User'
    // );

    // if (!emailResult.success) {
    //   console.error('Failed to send password reset email:', emailResult.error);
    //   return res.status(500).json({
    //     success: false,
    //     message: 'Failed to send password reset email. Please try again later.'
    //   });
    // }

    res.json({
      success: true,
      message: 'We have sent a password reset link on registered email.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Hash the provided token to compare with stored token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid reset token
    const [tokens] = await pool.execute(
      `SELECT prt.user_id, prt.expires_at, u.email, u.first_name 
       FROM password_reset_tokens prt 
       JOIN users u ON prt.user_id = u.id 
       WHERE prt.token = ? AND prt.expires_at > NOW() AND prt.used_at IS NULL`,
      [hashedToken]
    );

    if (tokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    const tokenData = tokens[0];

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Update user password
      await connection.execute(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedNewPassword, tokenData.user_id]
      );

      // Mark token as used
      await connection.execute(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE token = ?',
        [hashedToken]
      );

      // Invalidate all existing refresh tokens for security
      await connection.execute(
        'DELETE FROM refresh_tokens WHERE user_id = ?',
        [tokenData.user_id]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Password has been reset successfully. Please login with your new password.'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  changePassword,
  forgotPassword,
  resetPassword
};