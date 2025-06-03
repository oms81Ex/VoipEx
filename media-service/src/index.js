require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');
const http = require('http');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const mediaRoutes = require('./routes/media.routes');
const WebRTCService = require('./services/webrtc.service');
const recordingService = require('./services/recording.service');
const { handleError } = require('./utils/error');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true
}));
app.use(helmet());
app.use(morgan('combined'));

// Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VoIP Media Service API',
      version: '1.0.0',
      description: 'API documentation for VoIP Media Service'
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3004}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/media', mediaRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// WebSocket event handlers
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join-room', ({ roomId, userId }) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-joined', { userId });
  });

  socket.on('leave-room', ({ roomId, userId }) => {
    socket.leave(roomId);
    socket.to(roomId).emit('user-left', { userId });
  });

  socket.on('media-signal', ({ roomId, userId, signal }) => {
    socket.to(roomId).emit('media-signal', { userId, signal });
  });

  socket.on('stream-quality', ({ roomId, userId, quality }) => {
    socket.to(roomId).emit('stream-quality-update', { userId, quality });
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling
app.use(handleError);

// Initialize services
const initializeServices = async () => {
  try {
    await WebRTCService.initialize();
    recordingService.initialize();
    logger.info('Services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
};

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/voip-media')
  .then(() => {
    logger.info('Connected to MongoDB');
    return initializeServices();
  })
  .catch((error) => {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Start server
const PORT = process.env.PORT || 3004;
server.listen(PORT, () => {
  logger.info(`Media service running on port ${PORT}`);
});
