-- Create transcriptions table for whatsapp2text database
-- Run this SQL query in your MySQL database

USE whatsapp2text;

CREATE TABLE IF NOT EXISTS transcriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  audio_file_id INT,
  original_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500),
  file_size BIGINT,
  mime_type VARCHAR(100),
  transcription_text TEXT,
  duration VARCHAR(10) DEFAULT '0:00',
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  language VARCHAR(10) DEFAULT 'en',
  confidence_score DECIMAL(3,2) DEFAULT 0.00,
  word_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_status (user_id, status),
  INDEX idx_created_at (created_at),
  INDEX idx_language (language)
);

-- Verify the table was created successfully
DESCRIBE transcriptions;

-- Show table structure
SHOW CREATE TABLE transcriptions;

-- Check if table exists and has correct structure
SELECT 
  TABLE_NAME,
  TABLE_ROWS,
  DATA_LENGTH,
  INDEX_LENGTH
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'whatsapp2text' 
AND TABLE_NAME = 'transcriptions'; 