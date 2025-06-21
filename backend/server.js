// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

// Import custom modules
const logger = require('./utils/logger');
const { apiLimiter } = require('./middleware/rateLimiter');
const { cacheMiddleware, warmCache, getCacheStats } = require('./middleware/cache');
const TwilioService = require('./services/twilioService');
const spoofCallingRoutes = require('./routes/spoofCalling');

// Validate environment variables
const requiredEnvVars = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER',
    'AGENT_PHONE_NUMBER'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
    logger.error('Missing required environment variables', { missing: missingEnvVars });
    process.exit(1);
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Twilio service
let twilioService;
try {
    twilioService = new TwilioService();
    logger.info('Twilio service initialized successfully');
} catch (error) {
    logger.error('Failed to initialize Twilio service', { error: error.message });
    process.exit(1);
}

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// Performance middleware
app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

// CORS configuration
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
        : true,
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('Request completed', {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
    });
    
    next();
});

// Apply rate limiting to all routes
app.use(apiLimiter);

// Health check endpoint
app.get('/health', cacheMiddleware(60), (req, res) => {
    const healthCheck = {
        uptime: process.uptime(),
        message: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: require('./package.json').version,
        cache: getCacheStats()
    };
    
    res.json(healthCheck);
});

// Cache statistics endpoint
app.get('/api/cache/stats', (req, res) => {
    const stats = getCacheStats();
    res.json({
        success: true,
        stats: stats
    });
});

// --- Enhanced SMS Endpoint ---
app.post('/send-sms', async (req, res) => {
    const { to, body, from } = req.body;
    
    if (!to || !body) {
        return res.status(400).json({ 
            success: false, 
            message: 'Missing required fields: to, body' 
        });
    }

    try {
        const options = from ? { from } : {};
        const result = await twilioService.sendSMS(to, body, options);
        
        if (result.success) {
            res.json({
                success: true,
                messageId: result.messageId,
                message: result.message
            });
        } else {
            res.status(500).json({
                success: false,
                message: result.error
            });
        }
    } catch (error) {
        logger.error('Error in SMS endpoint', {
            error: error.message,
            to: to,
            ip: req.ip
        });
        
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// --- Enhanced Call Endpoint ---
app.post('/make-call', async (req, res) => {
    const { to, message, record } = req.body;
    
    if (!to) {
        return res.status(400).json({ 
            success: false, 
            message: 'Missing required field: to' 
        });
    }

    try {
        const options = {
            message: message || 'Conectando con el cliente, por favor espere.',
            record: record || false,
            statusCallback: `${process.env.VOICE_WEBHOOK_URL}/status`
        };
        
        const result = await twilioService.makeCall(to, options);
        
        if (result.success) {
            res.json({
                success: true,
                callId: result.callId,
                message: result.message
            });
        } else {
            res.status(500).json({
                success: false,
                message: result.error
            });
        }
    } catch (error) {
        logger.error('Error in call endpoint', {
            error: error.message,
            to: to,
            ip: req.ip
        });
        
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Mount spoof calling routes
app.use('/api/spoof', spoofCallingRoutes);

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true,
    lastModified: true
}));

// Catch-all handler for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Global error handler
app.use((error, req, res, next) => {
    logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
    });

    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : error.message
    });
});

// Handle 404 errors
app.use((req, res) => {
    logger.warn('Route not found', {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
    });
    
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
        reason: reason,
        promise: promise
    });
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack
    });
    process.exit(1);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', async () => {
    logger.info(`Server started successfully`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        pid: process.pid
    });
    
    // Warm up cache
    await warmCache();
    
    logger.info('Application ready to accept connections');
});

// Set server timeout
server.timeout = 30000; // 30 seconds

module.exports = app;
