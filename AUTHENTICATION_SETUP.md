# Authentication Setup Guide

This guide will help you set up the complete authentication system for the WhatsApp Audio2Text application.

## ✅ What's Implemented

### Backend API
- **User Registration** (`POST /api/auth/register`)
- **User Login** (`POST /api/auth/login`)  
- **Token Refresh** (`POST /api/auth/refresh`)
- **User Logout** (`POST /api/auth/logout`)
- **Password Change** (`POST /api/auth/change-password`)
- JWT authentication with access and refresh tokens
- Secure password hashing with bcrypt
- Database integration with MySQL

### Frontend UI
- **Signup Page** (`/signup`) - Connected to backend API
- **Signin Page** (`/signin`) - Connected to backend API
- **AuthContext** - Manages authentication state
- **API Service** - Handles all backend communication
- Proper error handling and loading states
- Automatic token storage in localStorage

## 🚀 Setup Instructions

### 1. Database Setup

Create a MySQL database and tables:

```sql
CREATE DATABASE whatsapp_audio2text;
USE whatsapp_audio2text;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  password VARCHAR(255) NOT NULL,
  language VARCHAR(10) DEFAULT 'en',
  is_premium BOOLEAN DEFAULT FALSE,
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  status ENUM('active', 'inactive', 'cancelled', 'past_due') DEFAULT 'inactive',
  plan_type ENUM('free', 'premium') DEFAULT 'free',
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 2. Environment Variables

#### Frontend (.env in root directory)
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
```

#### Backend (backend/.env)
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=whatsapp_audio2text

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Stripe Configuration (Optional)
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here
```

### 3. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
```

### 4. Start the Application

```bash
# Start both frontend and backend (from root directory)
npm run dev

# Or start individually:
# Backend only
cd backend && npm run dev

# Frontend only (in another terminal)
npm run frontend:dev
```

## 🔧 API Endpoints

### Authentication Routes

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/refresh` | Refresh access token | No |
| POST | `/api/auth/logout` | Logout user | Yes |
| POST | `/api/auth/change-password` | Change password | Yes |

### Request/Response Examples

#### Register User
```javascript
// Request
POST /api/auth/register
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone_number": "+1234567890", // Optional
  "password": "securePassword123",
  "language": "en"
}

// Response
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "name": "John Doe",
      "email": "john@example.com",
      "phone_number": "+1234567890",
      "language": "en",
      "is_premium": false
    },
    "accessToken": "jwt_access_token_here",
    "refreshToken": "jwt_refresh_token_here"
  }
}
```

#### Login User
```javascript
// Request
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "securePassword123"
}

// Response (same as register)
```

## 🎯 Features

### Security Features
- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Tokens**: Secure access and refresh token system
- **Rate Limiting**: Protection against brute force attacks
- **CORS Configuration**: Secure cross-origin requests
- **Input Validation**: Comprehensive request validation
- **Helmet**: Security headers protection

### User Experience
- **Error Handling**: Clear error messages for users
- **Loading States**: Visual feedback during API calls
- **Form Validation**: Client-side validation with proper UX
- **Responsive Design**: Works on all device sizes
- **Auto-redirect**: Seamless navigation after auth actions

### Token Management
- **Access Tokens**: Short-lived (24h) for API access
- **Refresh Tokens**: Long-lived (7d) for token renewal
- **Automatic Storage**: Tokens saved in localStorage
- **Token Cleanup**: Proper cleanup on logout

## 🧪 Testing the Authentication

1. **Registration Test**:
   - Go to `/signup`
   - Fill in the form with valid data
   - Submit and verify redirect to `/welcome`

2. **Login Test**:
   - Go to `/signin`
   - Use the credentials from registration
   - Submit and verify redirect to `/dashboard`

3. **Logout Test**:
   - Click logout (when implemented in UI)
   - Verify tokens are cleared from localStorage

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Failed**:
   - Check MySQL is running
   - Verify database credentials in backend/.env
   - Ensure database exists

2. **CORS Errors**:
   - Check FRONTEND_URL in backend/.env matches your frontend URL
   - Ensure backend is running on correct port

3. **Token Errors**:
   - Check JWT_SECRET is set in backend/.env
   - Clear localStorage if tokens are corrupted

4. **Network Errors**:
   - Verify VITE_API_BASE_URL in frontend .env
   - Check backend is running on specified port

### Development Tips

- Use browser DevTools Network tab to debug API calls
- Check browser console for error messages
- Verify localStorage contains tokens after login
- Check backend console for server errors

## 📁 File Structure

```
├── src/
│   ├── context/
│   │   └── AuthContext.tsx          # Authentication state management
│   ├── services/
│   │   └── api.ts                   # API service for backend communication
│   └── pages/
│       ├── Signup.tsx               # User registration page
│       └── Signin.tsx               # User login page
├── backend/
│   ├── controllers/
│   │   └── authController.js        # Authentication logic
│   ├── routes/
│   │   └── auth.js                  # Authentication routes
│   ├── middleware/
│   │   ├── auth.js                  # JWT middleware
│   │   └── validation.js            # Input validation
│   └── config/
│       └── database.js              # Database configuration
└── .env                             # Frontend environment variables
└── backend/.env                     # Backend environment variables
```

The authentication system is now fully functional and ready for production use! 