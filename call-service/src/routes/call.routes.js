const express = require('express');
const callController = require('../controllers/call.controller');
const { protect } = require('../middleware/auth');
const { validateCallInitiation } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * /calls:
 *   post:
 *     tags: [Calls]
 *     summary: Initiate a new call
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - roomId
 *               - participants
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [audio, video]
 *               roomId:
 *                 type: string
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Call initiated successfully
 */
router.post('/', protect, validateCallInitiation, callController.initiateCall);

/**
 * @swagger
 * /calls/{callId}/join:
 *   post:
 *     tags: [Calls]
 *     summary: Join an existing call
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: callId
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
 *               deviceInfo:
 *                 type: object
 *     responses:
 *       200:
 *         description: Successfully joined the call
 */
router.post('/:callId/join', protect, callController.joinCall);

/**
 * @swagger
 * /calls/{callId}/leave:
 *   post:
 *     tags: [Calls]
 *     summary: Leave a call
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully left the call
 */
router.post('/:callId/leave', protect, callController.leaveCall);

/**
 * @swagger
 * /calls/{callId}:
 *   get:
 *     tags: [Calls]
 *     summary: Get call details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Call details retrieved successfully
 */
router.get('/:callId', protect, callController.getCall);

/**
 * @swagger
 * /calls/{callId}/quality:
 *   put:
 *     tags: [Calls]
 *     summary: Update call quality metrics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: callId
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
 *               audioQuality:
 *                 type: number
 *               videoQuality:
 *                 type: number
 *               networkQuality:
 *                 type: number
 *     responses:
 *       200:
 *         description: Call quality updated successfully
 */
router.put('/:callId/quality', protect, callController.updateCallQuality);

/**
 * @swagger
 * /calls/history:
 *   get:
 *     tags: [Calls]
 *     summary: Get user's call history
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Call history retrieved successfully
 */
router.get('/history', protect, callController.getCallHistory);

module.exports = router; 