const mysql = require('mysql2/promise');
require('dotenv').config();

console.log("DB_HOST - ", process.env.DB_HOST)
console.log("DB_PORT - ", process.env.DB_PORT)
console.log("DB_USER - ", process.env.DB_USER)
console.log("DB_PASSWORD - ", process.env.DB_PASSWORD)
console.log("DB_NAME - ", process.env.DB_NAME)


// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
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