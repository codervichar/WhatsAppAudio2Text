-- Migration Script: Migrate from audio_files to transcriptions table
-- Run this script after creating the transcriptions table to migrate existing data

-- Step 1: Create transcriptions table if it doesn't exist
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

-- Step 2: Migrate existing data from audio_files to transcriptions
INSERT INTO transcriptions (
  user_id,
  audio_file_id,
  original_filename,
  file_path,
  file_size,
  mime_type,
  transcription_text,
  duration,
  status,
  language,
  confidence_score,
  word_count,
  created_at,
  updated_at
)
SELECT 
  user_id,
  id as audio_file_id,
  original_name as original_filename,
  file_path,
  file_size,
  mime_type,
  transcription as transcription_text,
  '0:00' as duration,
  CASE 
    WHEN status IN ('pending', 'processing', 'completed', 'failed') THEN status
    ELSE 'pending'
  END as status,
  'en' as language,
  0.00 as confidence_score,
  CASE 
    WHEN transcription IS NOT NULL AND transcription != '' 
    THEN LENGTH(transcription) - LENGTH(REPLACE(transcription, ' ', '')) + 1
    ELSE 0
  END as word_count,
  created_at,
  updated_at
FROM audio_files 
WHERE transcription IS NOT NULL OR status IN ('pending', 'processing', 'completed', 'failed');

-- Step 3: Update audio_files table to remove transcription-related fields
-- (Optional - uncomment if you want to clean up the audio_files table)
-- ALTER TABLE audio_files DROP COLUMN transcription;
-- ALTER TABLE audio_files MODIFY COLUMN status ENUM('uploaded', 'processed', 'deleted') DEFAULT 'uploaded';

-- Step 4: Update existing audio_files status to 'uploaded' for files that were processed
UPDATE audio_files 
SET status = 'uploaded' 
WHERE status IN ('pending', 'processing', 'completed', 'failed');

-- Step 5: Verify migration
SELECT 
  'audio_files count' as table_name, COUNT(*) as count 
FROM audio_files
UNION ALL
SELECT 
  'transcriptions count' as table_name, COUNT(*) as count 
FROM transcriptions;

-- Step 6: Show sample migrated data
SELECT 
  id,
  user_id,
  original_filename,
  status,
  language,
  word_count,
  created_at
FROM transcriptions 
ORDER BY created_at DESC 
LIMIT 10;

-- Migration completed successfully!
-- The transcriptions table now contains all your transcription data
-- The audio_files table is now used only for file management 