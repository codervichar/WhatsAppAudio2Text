-- Database Migration: Add first_name and last_name columns
-- Run this SQL script to update your existing database

-- Step 1: Add new columns
ALTER TABLE users 
ADD COLUMN first_name VARCHAR(255) AFTER id,
ADD COLUMN last_name VARCHAR(255) AFTER first_name;

-- Step 2: Migrate existing data (if you have users with 'name' field)
-- This attempts to split existing names into first and last names
UPDATE users 
SET first_name = CASE 
    WHEN name IS NOT NULL AND name != '' THEN 
        CASE 
            WHEN LOCATE(' ', name) > 0 THEN SUBSTRING(name, 1, LOCATE(' ', name) - 1)
            ELSE name
        END
    ELSE 'User'
END,
last_name = CASE 
    WHEN name IS NOT NULL AND name != '' THEN 
        CASE 
            WHEN LOCATE(' ', name) > 0 THEN SUBSTRING(name, LOCATE(' ', name) + 1)
            ELSE ''
        END
    ELSE ''
END
WHERE name IS NOT NULL;

-- Step 3: Set default values for any NULL entries
UPDATE users 
SET first_name = 'User', last_name = ''
WHERE first_name IS NULL OR first_name = '';

-- Step 4: Make first_name required (optional - uncomment if needed)
-- ALTER TABLE users MODIFY COLUMN first_name VARCHAR(255) NOT NULL;

-- Step 5: Optional - Remove the old name column after verification
-- ALTER TABLE users DROP COLUMN name;

-- Verify the migration
SELECT id, first_name, last_name, CONCAT(first_name, ' ', last_name) as full_name, email FROM users LIMIT 10;

-- Step 6: Create subscriptions table for Stripe integration
CREATE TABLE IF NOT EXISTS subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  stripe_subscription_id VARCHAR(255) NOT NULL,
  plan VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  subscription_minutes INT DEFAULT 3000,
  used_minutes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_stripe_subscription (stripe_subscription_id)
);

-- Step 7: Create transcriptions table for transcription history
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

-- Step 8: Create audio_files table for file management (if needed for other purposes)
CREATE TABLE IF NOT EXISTS audio_files (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  status ENUM('uploaded', 'processed', 'deleted') DEFAULT 'uploaded',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_status (user_id, status),
  INDEX idx_created_at (created_at)
);

-- Verify subscriptions table
DESCRIBE subscriptions;

-- Verify transcriptions table
DESCRIBE transcriptions;

-- Verify audio_files table
DESCRIBE audio_files; 