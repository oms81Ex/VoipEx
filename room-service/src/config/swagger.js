const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VoIP Room Service API',
      version: '1.0.0',
      description: 'API documentation for the VoIP Room Service',
    },
    servers: [
      {
        url: process.env.BASE_URL || 'http://localhost:3006',
        description: 'Room Service API Server',
      },
    ],
    components: {
      schemas: {
        Room: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Room name',
              example: 'Team Meeting',
            },
            shortCode: {
              type: 'string',
              description: 'Unique room code',
              example: 'ABC123',
            },
            hostId: {
              type: 'string',
              description: 'Host user ID',
            },
            maxParticipants: {
              type: 'number',
              description: 'Maximum number of participants',
              example: 10,
            },
            isPrivate: {
              type: 'boolean',
              description: 'Whether the room is private',
              example: false,
            },
            status: {
              type: 'string',
              enum: ['active', 'ended', 'scheduled'],
              description: 'Room status',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error',
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'], // Path to the API routes
};

module.exports = swaggerJsdoc(options); 