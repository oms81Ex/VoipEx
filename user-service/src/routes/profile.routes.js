const express = require('express');
const profileController = require('../controllers/profile.controller');
const { protect } = require('../middleware/auth');
const { validateProfileUpdate, validateStatusUpdate } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * /profile:
 *   get:
 *     tags: [Profile]
 *     summary: Get user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 */
router.get('/', protect, profileController.getProfile);

/**
 * @swagger
 * /profile:
 *   put:
 *     tags: [Profile]
 *     summary: Update user profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               avatar:
 *                 type: string
 *               timezone:
 *                 type: string
 *               language:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put('/', protect, validateProfileUpdate, profileController.updateProfile);

/**
 * @swagger
 * /profile/status:
 *   put:
 *     tags: [Profile]
 *     summary: Update user status
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [online, offline, busy, away]
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.put('/status', protect, validateStatusUpdate, profileController.updateStatus);

/**
 * @swagger
 * /profile/preferences:
 *   put:
 *     tags: [Profile]
 *     summary: Update user preferences
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               theme:
 *                 type: string
 *                 enum: [light, dark, system]
 *               audioInput:
 *                 type: object
 *               videoInput:
 *                 type: object
 *               audioOutput:
 *                 type: object
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 */
router.put('/preferences', protect, profileController.updatePreferences);

/**
 * @swagger
 * /profile/notifications:
 *   put:
 *     tags: [Profile]
 *     summary: Update notification settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: object
 *               push:
 *                 type: object
 *     responses:
 *       200:
 *         description: Notification settings updated successfully
 */
router.put('/notifications', protect, profileController.updateNotifications);

/**
 * @swagger
 * /profile/online:
 *   get:
 *     tags: [Profile]
 *     summary: Get online users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of online users retrieved successfully
 */
router.get('/online', protect, profileController.getOnlineUsers);

// Update user profile
router.put('/update', protect, validateProfileUpdate, profileController.updateProfile);

module.exports = router; 