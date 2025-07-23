# Forgot Password Setup Guide

This guide explains how to set up and use the forgot password functionality in the WhatsApp Audio2Text application.

## Overview

The forgot password feature allows users to reset their passwords by receiving a secure reset link via email. The implementation includes:

- **Forgot Password Endpoint**: Generates a secure token and sends reset email
- **Reset Password Endpoint**: Validates token and updates user password
- **Security Features**: Token expiration, hashed tokens, one-time use

## Database Setup

### 1. Create Password Reset Tokens Table

Run the following SQL migration to create the required table:

```sql
-- Run this in your MySQL database
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
);
```

Or use the migration file:
```bash
mysql -u your_username -p your_database_name < backend/migrations/password_reset_tokens.sql
```

## Email Configuration

### 1. Environment Variables

Add the following variables to your `backend/.env` file:

```env
# Email Configuration for Password Reset
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
FRONTEND_URL=http://localhost:3000
```

### 2. Gmail Setup (Recommended)

For Gmail, you'll need to:

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password**:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and your device
   - Copy the generated 16-character password
   - Use this as your `SMTP_PASS` value

### 3. Other Email Providers

For other email providers, update the SMTP settings:

```env
# For Outlook/Hotmail
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587

# For Yahoo
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587

# For custom SMTP
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
```

## API Endpoints

### 1. Forgot Password

**Endpoint**: `POST /api/auth/forgot-password`  
**Access**: Public

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "If an account with that email exists, we have sent a password reset link."
}
```

**Features**:
- Returns same response whether user exists or not (security)
- Generates cryptographically secure token
- Sends beautiful HTML email with reset link
- Token expires in 1 hour

### 2. Reset Password

**Endpoint**: `POST /api/auth/reset-password`  
**Access**: Public

**Request Body**:
```json
{
  "token": "secure-reset-token-from-email",
  "newPassword": "newSecurePassword123"
}
```

**Success Response**:
```json
{
  "success": true,
  "message": "Password has been reset successfully. Please login with your new password."
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Invalid or expired reset token"
}
```

**Features**:
- Validates token and expiration
- Marks token as used (one-time use)
- Invalidates all user sessions for security
- Uses database transactions for consistency

## Frontend Integration

### 1. Forgot Password Form

```javascript
const handleForgotPassword = async (email) => {
  try {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    
    if (data.success) {
      // Show success message
      alert('Reset link sent to your email!');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### 2. Reset Password Form

```javascript
const handleResetPassword = async (token, newPassword) => {
  try {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, newPassword }),
    });

    const data = await response.json();
    
    if (data.success) {
      // Redirect to login
      window.location.href = '/login';
    } else {
      // Show error message
      alert(data.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### 3. Extract Token from URL

```javascript
// For reset password page
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

if (!token) {
  // Redirect to forgot password page
  window.location.href = '/forgot-password';
}
```

## Security Features

### 1. Token Security
- **Cryptographically Secure**: Uses `crypto.randomBytes(32)`
- **Hashed Storage**: Tokens are hashed before database storage
- **Unique Tokens**: Database constraint prevents duplicates

### 2. Expiration
- **Time-Limited**: Tokens expire in 1 hour
- **Database Cleanup**: Expired tokens are automatically rejected

### 3. One-Time Use
- **Single Use**: Tokens are marked as used after successful reset
- **Session Invalidation**: All user sessions are cleared after reset

### 4. Privacy Protection
- **Email Obfuscation**: Same response for existing/non-existing emails
- **Rate Limiting**: Recommend adding rate limiting for production

## Testing

### 1. Test Email Configuration

Add this to your server startup code to test email configuration:

```javascript
const { testEmailConfig } = require('./services/emailService');

// Test email on server start
testEmailConfig().then(isValid => {
  if (isValid) {
    console.log('✅ Email configuration is valid');
  } else {
    console.log('❌ Email configuration failed');
  }
});
```

### 2. Manual Testing

1. **Test Forgot Password**:
   ```bash
   curl -X POST http://localhost:5000/api/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```

2. **Test Reset Password**:
   ```bash
   curl -X POST http://localhost:5000/api/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{"token":"your-token-here","newPassword":"newPassword123"}'
   ```

## Production Considerations

### 1. Rate Limiting
Add rate limiting to prevent abuse:

```javascript
const rateLimit = require('express-rate-limit');

const forgotPasswordLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 attempts per window
  message: 'Too many password reset attempts, please try again later.'
});

router.post('/forgot-password', forgotPasswordLimit, validateForgotPassword, forgotPassword);
```

### 2. Email Delivery
- Consider using professional email services (SendGrid, AWS SES, Mailgun)
- Set up proper SPF, DKIM, and DMARC records
- Monitor email deliverability

### 3. Monitoring
- Log password reset attempts
- Monitor for suspicious activity
- Set up alerts for unusual patterns

### 4. Database Maintenance
Set up a cron job to clean expired tokens:

```sql
DELETE FROM password_reset_tokens 
WHERE expires_at < NOW() OR used_at IS NOT NULL;
```

## Troubleshooting

### Common Issues

1. **Email Not Sending**
   - Check SMTP credentials
   - Verify app password for Gmail
   - Check firewall/network restrictions

2. **Token Invalid/Expired**
   - Tokens expire in 1 hour
   - Tokens can only be used once
   - Check database for token existence

3. **Database Errors**
   - Ensure migration was run successfully
   - Check foreign key constraints
   - Verify user table exists

### Debug Mode

Enable debug logging in development:

```javascript
// In emailService.js
console.log('Email config:', {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  user: process.env.SMTP_USER ? '***' : 'missing'
});
```

## Support

For additional help:
1. Check the console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test email configuration with the provided test function
4. Ensure database migrations have been applied 