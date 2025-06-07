const express = require('express');
const router = express.Router();
const Redis = require('ioredis');
const logger = require('../utils/logger');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || '12qwaszx'
});

/**
 * @swagger
 * /guests/online:
 *   get:
 *     tags: [Guests]
 *     summary: Get online guest users
 *     responses:
 *       200:
 *         description: List of online guest users
 */
router.get('/online', async (req, res) => {
  try {
    logger.info('[GuestRoute] GET /online called');
    
    // Socket.io 서버에 저장된 게스트 목록을 가져오기
    // 실제로는 Redis나 공유 메모리에서 가져와야 함
    const guestUsers = [];
    
    // Redis에서 온라인 사용자 목록 가져오기
    const onlineUsers = await redis.hgetall('users:online');
    logger.info(`[GuestRoute] Redis returned ${Object.keys(onlineUsers).length} online users`);
    
    for (const [userId, userInfo] of Object.entries(onlineUsers)) {
      logger.info(`[GuestRoute] Processing user: ${userId}, info: ${userInfo}`);
      
      if (userId.startsWith('guest_')) {
        try {
          const info = JSON.parse(userInfo);
          const guestUser = {
            id: userId,
            name: info.name || userId,
            status: 'online',
            isGuest: true
          };
          guestUsers.push(guestUser);
          logger.info(`[GuestRoute] Added guest user: ${JSON.stringify(guestUser)}`);
        } catch (e) {
          logger.error('Error parsing user info:', e);
        }
      } else {
        logger.info(`[GuestRoute] Skipping non-guest user: ${userId}`);
      }
    }
    
    logger.info(`[GuestRoute] Returning ${guestUsers.length} guest users`);
    
    res.json({
      status: 'success',
      data: { users: guestUsers }
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
 * /guests/search:
 *   get:
 *     tags: [Guests]
 *     summary: Search guest users
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         required: true
 *         description: Search query
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({
        status: 'fail',
        message: 'Query parameter is required'
      });
    }
    
    const guestUsers = [];
    const onlineUsers = await redis.hgetall('users:online');
    
    for (const [userId, userInfo] of Object.entries(onlineUsers)) {
      if (userId.startsWith('guest_')) {
        try {
          const info = JSON.parse(userInfo);
          const userName = info.name || userId;
          
          // 이름이나 ID로 검색
          if (userName.toLowerCase().includes(query.toLowerCase()) || 
              userId.toLowerCase().includes(query.toLowerCase())) {
            guestUsers.push({
              id: userId,
              name: userName,
              status: 'online',
              isGuest: true
            });
          }
        } catch (e) {
          logger.error('Error parsing user info:', e);
        }
      }
    }
    
    res.json({
      status: 'success',
      data: { users: guestUsers }
    });
  } catch (error) {
    logger.error('Error searching guests:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to search guests'
    });
  }
});

/**
 * @swagger
 * /guests/cleanup-all:
 *   delete:
 *     tags: [Guests]
 *     summary: Delete all guest users from user-service (for server startup cleanup)
 *     responses:
 *       200:
 *         description: All guest users deleted successfully
 */
router.delete('/cleanup-all', async (req, res) => {
  try {
    logger.info('[GuestRoute] DELETE /cleanup-all called - Server startup cleanup');
    
    // Redis에서 모든 게스트 사용자 제거
    const onlineUsers = await redis.hgetall('users:online');
    let removedCount = 0;
    
    for (const [userId, userInfo] of Object.entries(onlineUsers)) {
      if (userId.startsWith('guest_')) {
        await redis.hdel('users:online', userId);
        removedCount++;
      }
    }
    
    // 게스트 관련 기타 데이터 정리
    const guestKeys = await redis.keys('guest:*');
    if (guestKeys.length > 0) {
      await redis.del(...guestKeys);
    }
    
    logger.info(`[GuestRoute] Server startup cleanup completed: removed ${removedCount} guest users, ${guestKeys.length} guest keys`);
    
    res.json({
      status: 'success',
      data: {
        removedUsers: removedCount,
        removedKeys: guestKeys.length,
        cleanupType: 'server_startup'
      }
    });
  } catch (error) {
    logger.error('Error during server startup guest cleanup:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cleanup guest users'
    });
  }
});

/**
 * @swagger
 * /guests/cleanup:
 *   delete:
 *     tags: [Guests]
 *     summary: Cleanup old guest users from user-service
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
router.delete('/cleanup', async (req, res) => {
  try {
    const { before } = req.query;
    let cutoffDate;
    
    if (before) {
      cutoffDate = new Date(before);
    } else {
      cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24시간 전
    }
    
    logger.info(`[GuestRoute] DELETE /cleanup called with cutoff date: ${cutoffDate.toISOString()}`);
    
    const onlineUsers = await redis.hgetall('users:online');
    let removedCount = 0;
    
    for (const [userId, userInfo] of Object.entries(onlineUsers)) {
      if (userId.startsWith('guest_')) {
        try {
          const info = JSON.parse(userInfo);
          const connectedAt = new Date(info.connectedAt);
          
          if (connectedAt < cutoffDate) {
            await redis.hdel('users:online', userId);
            removedCount++;
          }
        } catch (parseError) {
          // 잘못된 데이터 형식이면 제거
          await redis.hdel('users:online', userId);
          removedCount++;
        }
      }
    }
    
    logger.info(`[GuestRoute] Cleanup completed: removed ${removedCount} old guest users`);
    
    res.json({
      status: 'success',
      data: {
        removedCount,
        cutoffDate: cutoffDate.toISOString()
      }
    });
  } catch (error) {
    logger.error('Error cleaning up old guests:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cleanup old guests'
    });
  }
});

module.exports = router;
