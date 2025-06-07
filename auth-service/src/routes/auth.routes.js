const express = require('express');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User successfully registered
 */
router.post('/register', validateRegister, authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User successfully logged in
 */
router.post('/login', validateLogin, authController.login);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New access token generated
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User successfully logged out
 */
router.post('/logout', protect, authController.logout);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user info
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 */
router.get('/me', protect, authController.getCurrentUser);

/**
 * @swagger
 * /auth/guest:
 *   post:
 *     tags: [Auth]
 *     summary: Generate a guest token
 *     responses:
 *       200:
 *         description: Guest token generated
 */
router.post('/guest', authController.guest);

/**
 * @swagger
 * /auth/guest/cleanup-all:
 *   delete:
 *     tags: [Auth]
 *     summary: Delete all guest users (for server startup cleanup)
 *     responses:
 *       200:
 *         description: All guest users deleted successfully
 */
router.delete('/guest/cleanup-all', authController.cleanupAllGuests);

/**
 * @swagger
 * /auth/guest/cleanup:
 *   delete:
 *     tags: [Auth]
 *     summary: Cleanup old guest users
 *     parameters:
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Delete guests created before this date
 *     responses:
 *       200:
 *         description: Old guest users cleaned up
 */
router.delete('/guest/cleanup', authController.cleanupGuests);

/**
 * @swagger
 * /auth/guest/{guestId}:
 *   delete:
 *     tags: [Auth]
 *     summary: Delete a guest user
 *     parameters:
 *       - in: path
 *         name: guestId
 *         required: true
 *         schema:
 *           type: string
 *         description: Guest user ID to delete
 *     responses:
 *       200:
 *         description: Guest user deleted successfully
 */
router.delete('/guest/:guestId', authController.deleteGuest);

/**
 * @swagger
 * /auth/verify:
 *   get:
 *     tags: [Auth]
 *     summary: Verify JWT token and return user info
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid, user info returned
 */
router.get('/verify', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'fail', message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    const decoded = jwt.verify(token, JWT_SECRET);
    // 필요한 경우 DB에서 유저 정보 조회
    res.status(200).json({ status: 'success', user: decoded });
  } catch (error) {
    res.status(401).json({ status: 'fail', message: 'Invalid token', error: error.message });
  }
});

module.exports = router; 