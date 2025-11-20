const mysql = require('mysql2/promise');
require('dotenv').config();



// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10, // Reduced to prevent connection exhaustion
  queueLimit: 50, // Limit queue to prevent memory issues (was 0 = unlimited)
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Connection timeout in milliseconds
  connectTimeout: 30000, // Reduced to 30 seconds
  // Timeout for queries
  timeout: 30000, // Reduced to 30 seconds
  // Multiple statements not allowed for security
  multipleStatements: false,
  // Use connection pooling efficiently
  maxIdle: 5, // Reduced maximum idle connections
  idleTimeout: 180000, // Close idle connections after 3 minutes (reduced from 5)
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    connection.release();
  } catch (error) {
    process.exit(1);
  }
};

// Initialize database tables
// const initializeDatabase = async () => {
//   try {
//     // Create users table
//     await pool.execute(`
//       CREATE TABLE IF NOT EXISTS users (
//         id INT PRIMARY KEY AUTO_INCREMENT,
//         name VARCHAR(255) NOT NULL,
//         email VARCHAR(255) UNIQUE NOT NULL,
//         phone_number VARCHAR(20),
//         password VARCHAR(255) NOT NULL,
//         language VARCHAR(10) DEFAULT 'en',
//         is_premium BOOLEAN DEFAULT FALSE,
//         stripe_customer_id VARCHAR(255),
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
//       )
//     `);

//     // Create refresh_tokens table
//     await pool.execute(`
//       CREATE TABLE IF NOT EXISTS refresh_tokens (
//         id INT PRIMARY KEY AUTO_INCREMENT,
//         user_id INT NOT NULL,
//         token VARCHAR(500) NOT NULL,
//         expires_at TIMESTAMP NOT NULL,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
//       )
//     `);

//     // Create audio_files table
//     await pool.execute(`
//       CREATE TABLE IF NOT EXISTS audio_files (
//         id INT PRIMARY KEY AUTO_INCREMENT,
//         user_id INT NOT NULL,
//         filename VARCHAR(255) NOT NULL,
//         original_name VARCHAR(255) NOT NULL,
//         file_path VARCHAR(500) NOT NULL,
//         file_size BIGINT NOT NULL,
//         mime_type VARCHAR(100) NOT NULL,
//         transcription TEXT,
//         status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//         FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
//       )
//     `);

//     // Create subscriptions table
//     await pool.execute(`
//       CREATE TABLE IF NOT EXISTS subscriptions (
//         id INT PRIMARY KEY AUTO_INCREMENT,
//         user_id INT NOT NULL,
//         stripe_subscription_id VARCHAR(255) UNIQUE,
//         status ENUM('active', 'inactive', 'cancelled', 'past_due') DEFAULT 'inactive',
//         plan_type ENUM('free', 'premium') DEFAULT 'free',
//         current_period_start TIMESTAMP,
//         current_period_end TIMESTAMP,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//         FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
//       )
//     `);

//     console.log('✅ Database tables initialized successfully');
//   } catch (error) {
//     console.error('❌ Database initialization failed:', error.message);
//     throw error;
//   }
// };

module.exports = {
  pool,
  testConnection,
  // initializeDatabase
}; 