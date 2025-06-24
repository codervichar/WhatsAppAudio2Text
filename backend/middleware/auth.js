const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const [users] = await pool.execute(
      'SELECT id, email, first_name, last_name FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token - user not found' 
      });
    }

    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Middleware to check if user is premium
const requirePremium = (req, res, next) => {
  if (!req.user.is_premium) {
    return res.status(403).json({
      success: false,
      message: 'Premium subscription required'
    });
  }
  next();
};

// Generate access token
const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET, 
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_REFRESH_SECRET, 
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

// Store refresh token in database
const storeRefreshToken = async (userId, refreshToken) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  await pool.execute(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, refreshToken, expiresAt]
  );
};

// Verify refresh token
const verifyRefreshToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Check if token exists in database and is not expired
    const [tokens] = await pool.execute(
      'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()',
      [refreshToken]
    );

    if (tokens.length === 0) {
      throw new Error('Invalid refresh token');
    }

    return decoded;
  } catch (error) {
    throw error;
  }
};

// Remove refresh token from database
const removeRefreshToken = async (refreshToken) => {
  await pool.execute(
    'DELETE FROM refresh_tokens WHERE token = ?',
    [refreshToken]
  );
};

module.exports = {
  authenticateToken,
  requirePremium,
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  verifyRefreshToken,
  removeRefreshToken
}; 