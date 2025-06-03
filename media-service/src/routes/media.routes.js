const express = require('express');
const mediaController = require('../controllers/media.controller');
const { protect } = require('../middleware/auth');
const { validateStreamInitiation } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * /media/stream:
 *   post:
 *     tags: [Media]
 *     summary: Initialize a new media stream
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - callId
 *               - type
 *             properties:
 *               callId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [audio, video, screen]
 *     responses:
 *       201:
 *         description: Stream initialized successfully
 */
router.post('/stream', protect, validateStreamInitiation, mediaController.initializeStream);

/**
 * @swagger
 * /media/capabilities/{roomId}:
 *   get:
 *     tags: [Media]
 *     summary: Get WebRTC router capabilities
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Router capabilities retrieved successfully
 */
router.get('/capabilities/:roomId', protect, mediaController.getRouterCapabilities);

/**
 * @swagger
 * /media/transport/{roomId}:
 *   post:
 *     tags: [Media]
 *     summary: Create WebRTC transport
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transport created successfully
 */
router.post('/transport/:roomId', protect, mediaController.createTransport);

/**
 * @swagger
 * /media/transport/{roomId}/{transportId}/connect:
 *   post:
 *     tags: [Media]
 *     summary: Connect WebRTC transport
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: transportId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dtlsParameters
 *             properties:
 *               dtlsParameters:
 *                 type: object
 *     responses:
 *       200:
 *         description: Transport connected successfully
 */
router.post('/transport/:roomId/:transportId/connect', protect, mediaController.connectTransport);

/**
 * @swagger
 * /media/recording/{streamId}/start:
 *   post:
 *     tags: [Media]
 *     summary: Start recording a stream
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: streamId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recording started successfully
 */
router.post('/recording/:streamId/start', protect, mediaController.startRecording);

/**
 * @swagger
 * /media/recording/{streamId}/stop:
 *   post:
 *     tags: [Media]
 *     summary: Stop recording a stream
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: streamId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recording stopped successfully
 */
router.post('/recording/:streamId/stop', protect, mediaController.stopRecording);

/**
 * @swagger
 * /media/stream/{streamId}/quality:
 *   put:
 *     tags: [Media]
 *     summary: Update stream quality metrics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: streamId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               packetLoss:
 *                 type: number
 *               jitter:
 *                 type: number
 *               roundTripTime:
 *                 type: number
 *     responses:
 *       200:
 *         description: Stream quality updated successfully
 */
router.put('/stream/:streamId/quality', protect, mediaController.updateStreamQuality);

/**
 * @swagger
 * /media/stream/{streamId}/end:
 *   post:
 *     tags: [Media]
 *     summary: End a stream
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: streamId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stream ended successfully
 */
router.post('/stream/:streamId/end', protect, mediaController.endStream);

module.exports = router; 