# Controllers Documentation

This directory contains all the controller functions for the WhatsApp Audio2Text Backend API. Controllers handle the business logic and are separated from the route handlers for better code organization and maintainability.

## Structure

```
controllers/
├── authController.js     # Authentication related functions
├── userController.js     # User management functions
├── fileController.js     # File upload and management functions
└── README.md            # This documentation
```

## Controller Overview

### 1. Auth Controller (`authController.js`)

Handles all authentication-related operations:

#### Functions:
- **`register(req, res)`** - User registration with JWT token generation
- **`login(req, res)`** - User login with credential verification
- **`refresh(req, res)`** - JWT access token refresh
- **`logout(req, res)`** - User logout and token invalidation
- **`changePassword(req, res)`** - Secure password change with verification

#### Features:
- Password hashing with bcrypt (12 salt rounds)
- JWT token generation and management
- Refresh token storage and validation
- Secure password validation
- Automatic subscription creation on registration

---

### 2. User Controller (`userController.js`)

Manages user profile and account operations:

#### Functions:
- **`getProfile(req, res)`** - Retrieve user profile with subscription info
- **`updateProfile(req, res)`** - Update user information (name, phone, language)
- **`getStats(req, res)`** - Get user statistics and activity data
- **`deleteAccount(req, res)`** - Permanently delete user account

#### Features:
- Dynamic profile updates (only updates provided fields)
- Comprehensive user statistics
- Subscription status integration
- Cascade deletion for account removal

---

### 3. File Controller (`fileController.js`)

Handles file upload, management, and operations:

#### Functions:
- **`uploadFile(req, res)`** - Upload audio files with validation
- **`getFiles(req, res)`** - Retrieve user's files with pagination
- **`getFileById(req, res)`** - Get specific file details
- **`deleteFile(req, res)`** - Delete files from database and storage
- **`transcribeFile(req, res)`** - Trigger transcription (Premium feature)
- **`downloadFile(req, res)`** - Download original audio files

#### Features:
- Upload limits for free vs premium users
- File type and size validation
- Pagination support for file listings
- Physical file cleanup on deletion
- Premium feature restrictions

---

## Usage in Routes

Controllers are imported and used in route files:

```javascript
// Example from routes/auth.js
const { register, login, refresh, logout, changePassword } = require('../controllers/authController');

// Use in routes
router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);
```

## Error Handling

All controllers include comprehensive error handling:

- **Database Errors**: Proper MySQL error handling
- **Validation Errors**: Input validation with appropriate messages
- **File System Errors**: Safe file operations with cleanup
- **Authentication Errors**: Secure token and credential validation

## Response Format

All controllers follow a consistent response format:

### Success Response:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Response:
```json
{
  "success": false,
  "message": "Error description",
  "details": "Additional error details (optional)"
}
```

## Security Features

### Authentication Controller:
- Secure password hashing
- JWT token expiration
- Refresh token rotation
- Account lockout protection via rate limiting

### User Controller:
- User data isolation (users can only access their own data)
- Input sanitization and validation
- Secure profile updates

### File Controller:
- File type restrictions
- Size limitations
- User-specific file access
- Premium feature enforcement
- Secure file cleanup

## Database Integration

Controllers use the MySQL connection pool from `../config/database.js`:

```javascript
const { pool } = require('../config/database');

// Example usage
const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
```

## Middleware Integration

Controllers work with middleware for:
- **Authentication**: `authenticateToken` middleware
- **Authorization**: `requirePremium` middleware  
- **Validation**: Joi validation middleware
- **File Upload**: Multer middleware

## Future Enhancements

Potential improvements for controllers:

1. **Caching**: Implement Redis caching for frequently accessed data
2. **Background Jobs**: Add queue system for file processing
3. **Logging**: Enhanced logging with request tracking
4. **Metrics**: Add performance monitoring
5. **Testing**: Unit tests for all controller functions

## Best Practices

When working with controllers:

1. **Single Responsibility**: Each function should have one clear purpose
2. **Error Handling**: Always include proper try-catch blocks
3. **Validation**: Validate inputs before processing
4. **Security**: Never trust user input, always sanitize
5. **Performance**: Use database indexes and optimize queries
6. **Documentation**: Keep JSDoc comments updated 