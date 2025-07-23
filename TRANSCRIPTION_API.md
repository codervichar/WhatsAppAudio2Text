# Transcription API Documentation

This document describes the transcription history API endpoints that have been implemented to replace the dummy data with real database-driven functionality.

## API Endpoints

### 1. Get Transcription History
**GET** `/api/transcriptions`

Retrieves the user's transcription history with pagination, filtering, and search capabilities.

#### Query Parameters
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 10)
- `status` (optional): Filter by status ('all', 'completed', 'processing', 'failed', 'pending')
- `search` (optional): Search in file names and transcription text

#### Response
```json
{
  "success": true,
  "data": {
    "transcriptions": [
      {
        "id": "1",
        "date": "2023-12-01",
        "time": "14:30",
        "text": "Transcription text content...",
        "audioLength": "0:45",
        "status": "completed",
        "fileName": "audio_file.m4a",
        "fileSize": "2.3 MB",
        "language": "en",
        "confidenceScore": 0.95,
        "wordCount": 150,
        "createdAt": "2023-12-01T14:30:00.000Z",
        "updatedAt": "2023-12-01T14:35:00.000Z"
      }
    ],
    "statistics": {
      "total": 25,
      "completed": 20,
      "processing": 3,
      "failed": 2
    },
    "pagination": {
      "current_page": 1,
      "per_page": 10,
      "total": 25,
      "total_pages": 3
    }
  }
}
```

### 2. Get Transcription Statistics
**GET** `/api/transcriptions/stats`

Retrieves statistics about the user's transcriptions.

#### Response
```json
{
  "success": true,
  "data": {
    "statistics": {
      "total": 25,
      "completed": 20,
      "processing": 3,
      "failed": 2
    }
  }
}
```

### 3. Delete Transcription
**DELETE** `/api/transcriptions/:id`

Deletes a specific transcription and its associated audio file.

#### Response
```json
{
  "success": true,
  "message": "Transcription deleted successfully"
}
```

## Database Schema

### transcriptions Table
```sql
CREATE TABLE transcriptions (
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
```

### audio_files Table (for file management)
```sql
CREATE TABLE audio_files (
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
```

## Frontend Integration

The frontend has been updated to use real API data instead of dummy data:

### Key Changes
1. **Real-time data fetching** from the API
2. **Loading states** with skeleton placeholders
3. **Error handling** with user-friendly messages
4. **Search and filtering** with debounced API calls
5. **Delete functionality** with confirmation dialogs
6. **Statistics display** from real database counts

### Features
- **Debounced search**: API calls are delayed by 500ms to avoid excessive requests
- **Status filtering**: Filter by completion status
- **Pagination**: Load more transcriptions as needed
- **Real-time stats**: Statistics update automatically
- **Delete confirmation**: Prevents accidental deletions
- **Error recovery**: Graceful handling of API errors

## Setup Instructions

1. **Run the database migration**:
   ```sql
   -- Execute the database_migration.sql file
   ```

2. **Restart the backend server** to register the new routes

3. **Update environment variables** if needed:
   - Ensure database connection is properly configured
   - Verify file upload paths are accessible

4. **Test the API endpoints**:
   - Use the frontend to upload audio files
   - Check transcription history page
   - Verify search and filtering work
   - Test delete functionality

## Error Handling

The API includes comprehensive error handling:
- **Database errors**: Logged and returned as generic server errors
- **File system errors**: Graceful handling of missing files
- **Authentication errors**: Proper 401 responses
- **Validation errors**: Clear error messages for invalid requests

## Performance Considerations

- **Indexed queries**: Database indexes on user_id, status, and created_at
- **Pagination**: Limits result sets to prevent memory issues
- **Debounced search**: Reduces API calls during typing
- **Efficient filtering**: SQL-level filtering instead of client-side 