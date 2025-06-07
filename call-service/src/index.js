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

const callRoutes = require('./routes/call.routes');
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
      title: 'VoIP Call Service API',
      version: '1.0.0',
      description: 'API documentation for VoIP Call Service'
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3003}`,
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
app.use('/calls', callRoutes);
app.use('/call', callRoutes); // 안드로이드 앱 호환성을 위해 추가

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// WebSocket event handlers
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join-call', ({ callId, userId }) => {
    socket.join(callId);
    socket.to(callId).emit('user-joined', { userId });
  });

  socket.on('leave-call', ({ callId, userId }) => {
    socket.leave(callId);
    socket.to(callId).emit('user-left', { userId });
  });

  socket.on('call-signal', ({ callId, userId, signal }) => {
    socket.to(callId).emit('call-signal', { userId, signal });
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling
app.use(handleError);

// Database connection
if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(process.env.MONGODB_URI || process.env.MONGODB_URL || 'mongodb://localhost:27017/voip-call')
    .then(() => {
      logger.info('Connected to MongoDB');
    })
    .catch((error) => {
      logger.error('MongoDB connection error:', error);
      process.exit(1);
    });

  // Start server
  const PORT = process.env.PORT || 3003;
  server.listen(PORT, () => {
    logger.info(`Call service running on port ${PORT}`);
  });
}

module.exports = app;
