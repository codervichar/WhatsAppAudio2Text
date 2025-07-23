# 🚀 Full-Stack Setup Guide

This guide will help you run both the frontend and backend of the WhatsApp Audio2Text application simultaneously.

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## Quick Start (Single Command)

### 1. Install Dependencies
```bash
# Install all dependencies for both frontend and backend
npm run install:all
```

### 2. Environment Setup
Create environment files:

**Frontend:** Create `.env` in the root directory:
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
```

**Backend:** Create `.env` in the `backend` directory:
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

### 3. Database Setup
```sql
CREATE DATABASE whatsapp_audio2text;
```

### 4. Run Both Projects
```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start
```

## 🎯 Available Commands

### Development Commands
```bash
# Run both frontend and backend in development mode
npm run dev

# Run only backend in development mode  
npm run backend:dev

# Run only frontend in development mode
npm run frontend:dev
```

### Production Commands
```bash
# Run both in production mode
npm start

# Run only backend in production
npm run backend:start

# Build frontend for production
npm run frontend:build
```

### Utility Commands
```bash
# Install all dependencies (frontend + backend)
npm run install:all

# Build everything for production
npm run build:all

# Clean all node_modules and build files
npm run clean

# Run tests for both projects
npm test

# Preview frontend build
npm run frontend:preview

# Lint frontend code
npm run frontend:lint
```

## 🌐 Access URLs

When running in development mode:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api
- **Backend Health Check:** http://localhost:5000/health

## 📁 Project Structure

```
whatsapp-audio2text/
├── src/                    # Frontend source code
├── backend/               # Backend source code
│   ├── controllers/       # Business logic
│   ├── routes/           # API routes
│   ├── middleware/       # Auth & validation
│   ├── config/           # Database config
│   └── uploads/          # File uploads
├── package.json          # Root package.json with scripts
├── vite.config.ts        # Frontend build config
└── SETUP.md             # This file
```

## 🔧 Alternative Methods

### Method 2: Using PM2 (Process Manager)

Install PM2 globally:
```bash
npm install -g pm2
```

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'frontend',
      script: 'npm',
      args: 'run frontend:dev',
      cwd: './',
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'backend',
      script: 'npm',
      args: 'run dev',
      cwd: './backend',
      env: {
        NODE_ENV: 'development'
      }
    }
  ]
};
```

Run with PM2:
```bash
# Start both applications
pm2 start ecosystem.config.js

# Monitor applications
pm2 monit

# Stop all applications  
pm2 stop all

# Restart all applications
pm2 restart all
```

### Method 3: Using Docker Compose

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    volumes:
      - .:/app
      - /app/node_modules

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=development
      - DB_HOST=mysql
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      - mysql

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: whatsapp_audio2text
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

Run with Docker:
```bash
docker-compose up --build
```

### Method 4: Simple Shell Script

Create `start.sh` (Linux/Mac):
```bash
#!/bin/bash

# Start backend in background
cd backend
npm run dev &
BACKEND_PID=$!

# Start frontend in background  
cd ..
npm run frontend:dev &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
```

Create `start.bat` (Windows):
```batch
@echo off
start /b cmd /c "cd backend && npm run dev"
start /b cmd /c "npm run frontend:dev"
pause
```

## 🐛 Troubleshooting

### Port Conflicts
If ports 3000 or 5000 are already in use:

**Frontend:** Modify `vite.config.ts`:
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001 // Change port
  }
})
```

**Backend:** Change `PORT` in backend `.env` file:
```env
PORT=5001
```

### Database Connection Issues
1. Ensure MySQL is running
2. Check database credentials in backend `.env`
3. Verify database exists: `CREATE DATABASE whatsapp_audio2text;`

### Module Not Found Errors
```bash
# Reinstall all dependencies
npm run clean
npm run install:all
```

### CORS Issues
Ensure backend `.env` has correct frontend URL:
```env
FRONTEND_URL=http://localhost:3000
```

## 📋 Development Workflow

1. **First Time Setup:**
   ```bash
   npm run install:all
   # Setup .env files
   # Create database
   npm run dev
   ```

2. **Daily Development:**
   ```bash
   npm run dev
   ```

3. **Testing Production Build:**
   ```bash
   npm run build:all
   npm start
   ```

4. **Clean Restart:**
   ```bash
   npm run clean
   npm run install:all
   npm run dev
   ```

## 🔒 Security Notes

- Never commit `.env` files to version control
- Use strong, unique JWT secrets in production
- Configure proper CORS origins for production
- Use HTTPS in production environments

## 📖 API Documentation

Once running, access the API documentation:
- Base URL: http://localhost:5000/api
- Health Check: http://localhost:5000/health
- Full API docs available in `backend/README.md` 