const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const fileRoutes = require('./routes/files');
const webhookRoutes = require('./routes/webhook');
const stripeRoutes = require('./routes/stripe');
const transcriptionRoutes = require('./routes/transcriptions');
const contactRoutes = require('./routes/contact');

const app = express();
const PORT = process.env.PORT || 5000;

// Declare server variable at module level for graceful shutdown
let server;

// Trust proxy - IMPORTANT for rate limiting behind reverse proxy/load balancer
// This fixes the ERR_ERL_UNEXPECTED_X_FORWARDED_FOR error
app.set('trust proxy', true);

// Security middleware
app.use(helmet());

// Rate limiting to prevent abuse and CPU overload
// Note: app.set('trust proxy', true) above handles proxy trust for rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Limit each IP to 100 requests per windowMs in production
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests to reduce memory usage
  skipSuccessfulRequests: false,
  // Skip failed requests to prevent abuse
  skipFailedRequests: false
});

// Apply rate limiting to all API routes
app.use('/api/', limiter);

// Stricter rate limiting for webhook endpoints
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute per IP
  message: 'Too many webhook requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/webhook/', webhookLimiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.APP_URL || 'http://localhost:5173',
      'http://localhost:5173', // Vite default port
      'https://voicenotescribe.com', // Production frontend
      'https://www.voicenotescribe.com', // Production frontend with www
      'https://api.voicenotescribe.com' // API domain
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware - but exclude webhook routes for raw body
app.use((req, res, next) => {
  if (req.originalUrl === '/api/stripe/webhook') {
    // Skip body parsing for Stripe webhooks
    next();
  } else {
    // Use JSON parsing for all other routes
    express.json({ limit: '10mb' })(req, res, next);
  }
});

app.use((req, res, next) => {
  if (req.originalUrl === '/api/stripe/webhook') {
    // Skip URL encoding for Stripe webhooks
    next();
  } else {
    // Use URL encoding for all other routes
    express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
  }
});

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Debug middleware for API requests - only in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`🔍 ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/transcriptions', transcriptionRoutes);
app.use('/api/contact', contactRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'WhatsApp Audio2Text API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      files: '/api/files',
      contact: '/api/contact',
      health: '/health'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {

  // Multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File size too large'
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field'
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Database errors
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({
      success: false,
      message: 'Duplicate entry'
    });
  }

  // Default error
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
  return () => {
    if (server) {
      server.close(() => {
        // Close database pool
        const { pool } = require('./config/database');
        pool.end(() => {
          process.exit(0);
        });
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        process.exit(1);
      }, 10000);
    } else {
      process.exit(0);
    }
  };
};

process.on('SIGTERM', gracefulShutdown('SIGTERM'));
process.on('SIGINT', gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Initialize database tables
    // await initializeDatabase();

    // Start the server with timeouts
    server = app.listen(PORT, () => {
    });

    // Configure server timeouts to prevent resource exhaustion
    server.keepAliveTimeout = 65000; // 65 seconds (just above most load balancers)
    server.headersTimeout = 66000; // 66 seconds (should be > keepAliveTimeout)
    
    // Set request timeout - reduced to prevent long-running requests from consuming resources
    server.timeout = 120000; // 2 minutes (reduced from 5 minutes)
    
    // Set max listeners to prevent memory leaks
    server.setMaxListeners(20);

    return server;
  } catch (error) {
    process.exit(1);
  }
};

// Add process-level resource limits and monitoring
if (process.env.NODE_ENV === 'production') {
  // Monitor memory usage and restart if it gets too high
  setInterval(() => {
    const used = process.memoryUsage();
    const heapUsedMB = used.heapUsed / 1024 / 1024;
    const heapTotalMB = used.heapTotal / 1024 / 1024;
    
    // Log memory usage (can be removed in production or sent to monitoring service)
    if (heapUsedMB > 500) { // If using more than 500MB
      console.warn(`⚠️ High memory usage: ${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB`);
    }
    
    // Force garbage collection if available (requires --expose-gc flag)
    if (global.gc && heapUsedMB > 400) {
      global.gc();
    }
  }, 60000); // Check every minute
}

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;

// ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '62gb$t0/<Yb+';
// FLUSH PRIVILEGES;