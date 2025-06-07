const express = require('express');
const router = express.Router();
const Redis = require('ioredis');
const logger = require('../utils/logger');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || '12qwaszx'
});

// 온라인 게스트 목록 저장소 (메모리)
const onlineGuests = new Map();

/**
 * @swagger
 * /call/guests/online:
 *   post:
 *     tags: [Call]
 *     summary: Register guest as online
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully registered
 */
router.post('/guests/online', async (req, res) => {
  try {
    const { id, name } = req.body;
    
    if (!id || !name) {
      return res.status(400).json({
        status: 'error',
        message: 'id and name are required'
      });
    }
    
    // 메모리에 저장
    onlineGuests.set(id, { id, name, timestamp: Date.now() });
    
    // Redis에도 저장
    await redis.hset('call:guests:online', id, JSON.stringify({
      id,
      name,
      timestamp: Date.now()
    }));
    
    logger.info(`Guest registered online: ${id} (${name})`);
    
    res.json({ status: 'success' });
  } catch (error) {
    logger.error('Error registering guest:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to register guest'
    });
  }
});

/**
 * @swagger
 * /call/guests/online:
 *   get:
 *     tags: [Call]
 *     summary: Get online guests
 *     responses:
 *       200:
 *         description: List of online guests
 */
router.get('/guests/online', async (req, res) => {
  try {
    const guests = [];
    
    // Redis에서 가져오기
    const redisGuests = await redis.hgetall('call:guests:online');
    
    for (const [id, data] of Object.entries(redisGuests)) {
      try {
        const guestData = JSON.parse(data);
        // 30분 이상 된 게스트는 제외
        if (Date.now() - guestData.timestamp < 30 * 60 * 1000) {
          guests.push({
            id: guestData.id,
            name: guestData.name
          });
        } else {
          // 오래된 게스트 제거
          await redis.hdel('call:guests:online', id);
        }
      } catch (e) {
        logger.error('Error parsing guest data:', e);
      }
    }
    
    res.json({
      status: 'success',
      data: { guests }
    });
  } catch (error) {
    logger.error('Error getting online guests:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get online guests'
    });
  }
});

/**
 * @swagger
 * /call/guests/online/{id}:
 *   delete:
 *     tags: [Call]
 *     summary: Unregister guest from online
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully unregistered
 */
router.delete('/guests/online/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 메모리에서 제거
    onlineGuests.delete(id);
    
    // Redis에서 제거
    await redis.hdel('call:guests:online', id);
    
    logger.info(`Guest unregistered: ${id}`);
    
    res.json({ status: 'success' });
  } catch (error) {
    logger.error('Error unregistering guest:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to unregister guest'
    });
  }
});

// 초대 관련 API
const invites = new Map(); // 임시 저장소

router.post('/invite', async (req, res) => {
  try {
    const { fromId, fromName, toId, type } = req.body;
    
    if (!invites.has(toId)) {
      invites.set(toId, []);
    }
    
    invites.get(toId).push({
      fromId,
      fromName,
      type,
      timestamp: Date.now()
    });
    
    res.json({ status: 'success' });
  } catch (error) {
    logger.error('Error sending invite:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send invite'
    });
  }
});

router.get('/invites/:guestId', async (req, res) => {
  try {
    const { guestId } = req.params;
    const guestInvites = invites.get(guestId) || [];
    
    // 초대 목록 반환 후 삭제
    invites.delete(guestId);
    
    res.json({
      status: 'success',
      data: { invites: guestInvites }
    });
  } catch (error) {
    logger.error('Error getting invites:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get invites'
    });
  }
});

// 룸 생성/참가
router.post('/room', async (req, res) => {
  try {
    const { guestA, guestB } = req.body;
    const roomId = `${guestA}-${guestB}-${Date.now()}`;
    
    logger.info(`[GuestCall] Creating room - guestA: ${guestA}, guestB: ${guestB}, roomId: ${roomId}`);
    
    res.json({
      status: 'success',
      data: { roomId }
    });
  } catch (error) {
    logger.error('Error creating room:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create room'
    });
  }
});

/**
 * @swagger
 * /call/create-guest-call:
 *   post:
 *     tags: [Call]
 *     summary: Create a guest-to-guest call
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               callerId:
 *                 type: string
 *               calleeId:
 *                 type: string
 *               callerName:
 *                 type: string
 *               calleeName:
 *                 type: string
 *               callType:
 *                 type: string
 *                 enum: [audio, video]
 *     responses:
 *       200:
 *         description: Call created successfully
 */
router.post('/create-guest-call', async (req, res) => {
  try {
    const { callerId, calleeId, callerName, calleeName, callType = 'audio' } = req.body;
    
    logger.info(`[GuestCall] Creating guest call - callerId: ${callerId}, calleeId: ${calleeId}, callType: ${callType}`);
    
    if (!callerId || !calleeId) {
      logger.error('[GuestCall] Missing required parameters');
      return res.status(400).json({
        status: 'error',
        message: 'callerId and calleeId are required'
      });
    }
    
    // Generate unique call ID
    const callId = `guest-call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const roomId = `room-${callId}`;
    
    // Store call information in Redis
    const callData = {
      callId,
      roomId,
      callerId,
      calleeId,
      callerName: callerName || 'Guest',
      calleeName: calleeName || 'Guest',
      callType,
      status: 'initiated',
      createdAt: new Date().toISOString()
    };
    
    await redis.set(`call:${callId}`, JSON.stringify(callData), 'EX', 3600); // 1 hour TTL
    await redis.set(`room:${roomId}`, JSON.stringify(callData), 'EX', 3600);
    
    logger.info(`[GuestCall] Call created successfully - callId: ${callId}, roomId: ${roomId}`);
    
    res.json({
      status: 'success',
      data: {
        callId,
        roomId,
        ...callData
      }
    });
  } catch (error) {
    logger.error('[GuestCall] Error creating guest call:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create guest call',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /call/{callId}:
 *   get:
 *     tags: [Call]
 *     summary: Get call information
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Call information
 */
router.get('/:callId', async (req, res) => {
  try {
    const { callId } = req.params;
    
    logger.info(`[GuestCall] Getting call info - callId: ${callId}`);
    
    const callData = await redis.get(`call:${callId}`);
    
    if (!callData) {
      logger.error(`[GuestCall] Call not found - callId: ${callId}`);
      return res.status(404).json({
        status: 'error',
        message: 'Call not found'
      });
    }
    
    const call = JSON.parse(callData);
    logger.info(`[GuestCall] Call found - data: ${JSON.stringify(call)}`);
    
    res.json({
      status: 'success',
      data: call
    });
  } catch (error) {
    logger.error('[GuestCall] Error getting call info:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get call info',
      error: error.message
    });
  }
});

module.exports = router;
