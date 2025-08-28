# WhatsApp Audio2Text Backend API

A robust Node.js backend API for the WhatsApp Audio to Text application with JWT authentication, file upload capabilities, and MySQL database integration.

## Features

- 🔐 **JWT Authentication** with refresh tokens
- 📁 **File Upload** for audio files
- 🗃️ **MySQL Database** with connection pooling
- 🛡️ **Security** with Helmet, CORS, and rate limiting
- ✅ **Validation** with Joi
- 📝 **Logging** with Morgan
- 🚀 **Production Ready** with error handling and graceful shutdown
- 📱 **WhatsApp Integration** with country code support for international phone numbers

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Validation**: Joi
- **Security**: Helmet, CORS, bcryptjs
- **Others**: Compression, Morgan, dotenv

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the backend directory:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=whatsapp_audio2text

   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRES_IN=24h
   JWT_REFRESH_SECRET=your_refresh_token_secret_here
   JWT_REFRESH_EXPIRES_IN=7d

   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # CORS Configuration
   FRONTEND_URL=http://localhost:3000

   # File Upload Configuration
   MAX_FILE_SIZE=10485760
   UPLOAD_PATH=./uploads
   ```

4. **Set up MySQL database**
   
   Create a MySQL database:
   ```sql
   CREATE DATABASE whatsapp_audio2text;
   ```

5. **Start the server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

The server will automatically create the necessary database tables on first run.

## WhatsApp Integration

### Country Code Support

The WhatsApp integration now supports international phone numbers with proper country code handling:

1. **User Registration**: Users can register with their WhatsApp number and select their country
2. **Phone Number Matching**: The system can match users by:
   - Full phone number with country code (e.g., `+1234567890`)
   - Phone number without country code (e.g., `234567890`)
   - Constructed full number using stored country code

3. **Database Structure**:
   - `users.country_code`: References the `country.id` table
   - `users.wtp_number`: Stores the WhatsApp number (may or may not include country code)
   - `country.phonecode`: Stores the international dialing code

4. **Testing**: Use the test script to verify functionality:
   ```bash
   node scripts/test-whatsapp-country-code.js
   ```

### WhatsApp Message Flow

1. **Incoming Message**: WhatsApp sends a webhook with the sender's phone number
2. **User Lookup**: System searches for the user using multiple phone number formats
3. **Audio Processing**: If audio file is attached, it's processed and transcribed
4. **Response**: User receives transcription results via WhatsApp

## API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Endpoints

#### Authentication Routes (`/api/auth`)

##### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone_number": "+1234567890",
  "password": "securepassword",
  "language": "en"
}
```

##### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword"
}
```

##### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

##### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

##### Change Password
```http
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

#### User Routes (`/api/users`)

##### Get Profile
```http
GET /api/users/profile
Authorization: Bearer <token>
```

##### Update Profile
```http
PUT /api/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "phone_number": "+0987654321",
  "language": "es"
}
```

##### Get User Statistics
```http
GET /api/users/stats
Authorization: Bearer <token>
```

##### Delete Account
```http
DELETE /api/users/account
Authorization: Bearer <token>
```

#### File Routes (`/api/files`)

##### Upload Audio File
```http
POST /api/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

audioFile: <audio_file>
```

##### Get User Files
```http
GET /api/files?page=1&limit=10&status=completed
Authorization: Bearer <token>
```

##### Get File Details
```http
GET /api/files/:id
Authorization: Bearer <token>
```

##### Delete File
```http
DELETE /api/files/:id
Authorization: Bearer <token>
```

##### Download File
```http
GET /api/files/:id/download
Authorization: Bearer <token>
```

##### Trigger Transcription (Premium)
```http
POST /api/files/:id/transcribe
Authorization: Bearer <token>
```

### Response Format

All API responses follow this format:

#### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

#### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "details": "Detailed error message (in validation errors)"
}
```

### Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  password VARCHAR(255) NOT NULL,
  language VARCHAR(10) DEFAULT 'en',
  is_premium BOOLEAN DEFAULT FALSE,
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Audio Files Table
```sql
CREATE TABLE audio_files (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  transcription TEXT,
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## File Upload Limits

- **Free Users**: 5 files per day
- **Premium Users**: Unlimited uploads
- **File Size Limit**: 10MB
- **Supported Formats**: MP3, WAV, OGG, M4A, AAC, FLAC

## Security Features

- Password hashing with bcrypt
- JWT tokens with expiration
- Refresh token rotation
- Rate limiting (100 requests per 15 minutes)
- Auth rate limiting (5 attempts per 15 minutes)
- CORS protection
- Helmet security headers
- Input validation with Joi

## Development

### Available Scripts

```bash
# Start development server with nodemon
npm run dev

# Start production server
npm start

# Run tests
npm test
```

### Environment Variables

Make sure to set all required environment variables before running the application. Check the `.env.example` file for reference.

## Deployment

1. Set `NODE_ENV=production` in your environment
2. Configure your MySQL database
3. Set secure JWT secrets
4. Configure CORS for your frontend domain
5. Set up proper file storage (consider cloud storage for production)

## Error Handling

The API includes comprehensive error handling for:
- Database connection errors
- JWT token errors
- File upload errors
- Validation errors
- Rate limiting
- General server errors

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License. 