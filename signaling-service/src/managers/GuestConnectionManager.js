const Redis = require('ioredis');
const httpClient = require('http');
const logger = require('../utils/logger');

class GuestConnectionManager {
  constructor(io) {
    this.io = io;
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || '12qwaszx'
    });
    
    // 게스트 연결 정보 저장 (메모리)
    this.guestConnections = new Map();
    
    // 설정값들
    this.cleanupInterval = 5 * 60 * 1000; // 5분마다 정리
    this.heartbeatInterval = 30 * 1000;   // 30초마다 하트비트 체크
    this.connectionTimeout = 3 * 60 * 1000; // 3분 타임아웃
    this.pingInterval = 60 * 1000;        // 1분마다 ping 전송
    
    this.initializeManager();
  }
  
  /**
   * 매니저 초기화
   */
  initializeManager() {
    // 서버 시작 시 기존 게스트 데이터 정리
    this.cleanupOnStartup();
    
    this.startHeartbeatChecker();
    this.startPeriodicCleanup();
    this.startPingScheduler();
    logger.info('Guest Connection Manager initialized');
  }
  
  /**
   * 서버 시작 시 기존 게스트 데이터 정리
   */
  async cleanupOnStartup() {
    try {
      logger.info('Starting server startup cleanup for guest data...');
      
      // 1. Redis에서 모든 게스트 연결 정보 삭제
      await this.cleanupAllRedisGuestData();
      
      // 2. MongoDB에서 모든 게스트 사용자 삭제
      await this.cleanupAllDatabaseGuests();
      
      // 3. Redis 온라인 사용자 목록에서 게스트 제거
      await this.cleanupOnlineGuestUsers();
      
      logger.info('Server startup cleanup completed successfully');
      
    } catch (error) {
      logger.error('Error during server startup cleanup:', error);
      // 에러가 발생해도 서버 시작은 계속함
    }
  }
  
  /**
   * Redis에서 모든 게스트 연결 정보 삭제
   */
  async cleanupAllRedisGuestData() {
    try {
      // 게스트 연결 정보 삭제
      const connectionKeys = await this.redis.keys('guest_connection:*');
      if (connectionKeys.length > 0) {
        await this.redis.del(...connectionKeys);
        logger.info(`Deleted ${connectionKeys.length} guest connection records from Redis`);
      }
      
      // 게스트 세션 정보 삭제 (만약 있다면)
      const sessionKeys = await this.redis.keys('guest_session:*');
      if (sessionKeys.length > 0) {
        await this.redis.del(...sessionKeys);
        logger.info(`Deleted ${sessionKeys.length} guest session records from Redis`);
      }
      
    } catch (error) {
      logger.error('Error cleaning up Redis guest data:', error);
    }
  }
  
  /**
   * 데이터베이스에서 모든 게스트 사용자 삭제
   */
  async cleanupAllDatabaseGuests() {
    try {
      // 1. auth-service에서 게스트 삭제
      await this.cleanupAuthServiceGuests();
      
      // 2. user-service에서 게스트 삭제
      await this.cleanupUserServiceGuests();
      
    } catch (error) {
      logger.error('Error cleaning up database guests:', error);
    }
  }
  
  /**
   * auth-service에서 게스트 삭제
   */
  async cleanupAuthServiceGuests() {
    try {
      const options = {
        hostname: 'auth-service',
        port: 3001,
        path: '/auth/guest/cleanup-all',
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      await new Promise((resolve, reject) => {
        const req = httpClient.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const result = JSON.parse(data);
                logger.info(`Deleted ${result.data.deletedCount || 0} guest users from auth-service`);
              } catch (parseError) {
                logger.warn('Could not parse auth-service cleanup response, but operation completed');
              }
            } else {
              logger.warn(`Auth-service guest cleanup returned status ${res.statusCode}`);
            }
            resolve();
          });
        });
        req.on('error', (error) => {
          logger.error('Failed to connect to auth-service for cleanup:', error);
          resolve(); // 에러가 발생해도 서버 시작은 계속
        });
        req.end();
      });
      
    } catch (error) {
      logger.error('Error cleaning up auth-service guests:', error);
    }
  }
  
  /**
   * user-service에서 게스트 삭제
   */
  async cleanupUserServiceGuests() {
    try {
      const options = {
        hostname: 'user-service',
        port: 3002,
        path: '/guests/cleanup-all',
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      await new Promise((resolve, reject) => {
        const req = httpClient.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const result = JSON.parse(data);
                logger.info(`Cleaned up ${result.data.removedUsers || 0} guest users from user-service`);
              } catch (parseError) {
                logger.warn('Could not parse user-service cleanup response, but operation completed');
              }
            } else {
              logger.warn(`User-service guest cleanup returned status ${res.statusCode}`);
            }
            resolve();
          });
        });
        req.on('error', (error) => {
          logger.error('Failed to connect to user-service for cleanup:', error);
          resolve(); // 에러가 발생해도 서버 시작은 계속
        });
        req.end();
      });
      
    } catch (error) {
      logger.error('Error cleaning up user-service guests:', error);
    }
  }
  
  /**
   * Redis 온라인 사용자 목록에서 게스트 제거
   */
  async cleanupOnlineGuestUsers() {
    try {
      // 온라인 사용자 목록 조회
      const onlineUsers = await this.redis.hgetall('users:online');
      
      let removedCount = 0;
      for (const [userId, userDataStr] of Object.entries(onlineUsers)) {
        try {
          const userData = JSON.parse(userDataStr);
          
          // 게스트 사용자인지 확인
          if (userData.isGuest === true || userId.startsWith('guest_')) {
            await this.redis.hdel('users:online', userId);
            removedCount++;
          }
        } catch (parseError) {
          // 잘못된 데이터 형식이면 제거
          if (userId.startsWith('guest_')) {
            await this.redis.hdel('users:online', userId);
            removedCount++;
          }
        }
      }
      
      if (removedCount > 0) {
        logger.info(`Removed ${removedCount} guest users from online users list`);
      }
      
    } catch (error) {
      logger.error('Error cleaning up online guest users:', error);
    }
  }
  
  /**
   * 게스트 등록
   */
  async registerGuest(socket, guestData = {}) {
    const guestInfo = {
      socketId: socket.id,
      userId: socket.userId,
      name: socket.userName,
      joinedAt: new Date(),
      lastHeartbeat: new Date(),
      lastPing: new Date(),
      lastPongReceived: new Date(),
      status: 'online',
      roomId: null,
      ipAddress: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'] || 'unknown',
      isResponsive: true,
      missedPings: 0
    };
    
    // 메모리에 저장
    this.guestConnections.set(socket.id, guestInfo);
    
    // Redis에 저장 (TTL 설정)
    const redisData = {
      ...guestInfo,
      joinedAt: guestInfo.joinedAt.toISOString(),
      lastHeartbeat: guestInfo.lastHeartbeat.toISOString(),
      lastPing: guestInfo.lastPing.toISOString(),
      lastPongReceived: guestInfo.lastPongReceived.toISOString()
    };
    
    await this.redis.setex(
      `guest_connection:${socket.id}`,
      Math.floor(this.connectionTimeout / 1000),
      JSON.stringify(redisData)
    );
    
    // 소켓에 게스트 정보 추가
    socket.guestConnectionInfo = guestInfo;
    
    logger.info(`Guest registered in connection manager: ${guestInfo.userId} (${socket.id})`);
    
    return guestInfo;
  }
  
  /**
   * 게스트 연결 해제
   */
  async unregisterGuest(socketId, reason = 'disconnect') {
    const guestInfo = this.guestConnections.get(socketId);
    
    if (!guestInfo) {
      logger.warn(`Attempted to unregister non-existent guest: ${socketId}`);
      return;
    }
    
    logger.info(`Unregistering guest: ${guestInfo.userId} (${socketId}) - Reason: ${reason}`);
    
    try {
      // 메모리에서 제거
      this.guestConnections.delete(socketId);
      
      // Redis에서 제거
      await this.redis.del(`guest_connection:${socketId}`);
      
      // MongoDB에서 게스트 유저 삭제
      await this.deleteGuestFromDB(guestInfo.userId);
      
      // Redis의 온라인 유저 목록에서도 제거
      await this.redis.hdel('users:online', guestInfo.userId);
      
      // 다른 클라이언트들에게 게스트 퇴장 알림
      this.io.emit('guestLeft', {
        userId: guestInfo.userId,
        reason: reason
      });
      
      logger.info(`Guest unregistered successfully: ${guestInfo.userId}`);
      
    } catch (error) {
      logger.error(`Error unregistering guest ${guestInfo.userId}:`, error);
    }
  }
  
  /**
   * 하트비트 업데이트
   */
  async updateHeartbeat(socketId) {
    const guestInfo = this.guestConnections.get(socketId);
    
    if (guestInfo) {
      guestInfo.lastHeartbeat = new Date();
      guestInfo.isResponsive = true;
      guestInfo.missedPings = 0;
      
      // Redis TTL 갱신
      const redisData = {
        ...guestInfo,
        joinedAt: guestInfo.joinedAt.toISOString(),
        lastHeartbeat: guestInfo.lastHeartbeat.toISOString(),
        lastPing: guestInfo.lastPing.toISOString(),
        lastPongReceived: guestInfo.lastPongReceived.toISOString()
      };
      
      await this.redis.setex(
        `guest_connection:${socketId}`,
        Math.floor(this.connectionTimeout / 1000),
        JSON.stringify(redisData)
      );
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Pong 응답 처리
   */
  async handlePongResponse(socketId, data = {}) {
    const guestInfo = this.guestConnections.get(socketId);
    
    if (guestInfo) {
      guestInfo.lastPongReceived = new Date();
      guestInfo.isResponsive = true;
      guestInfo.missedPings = 0;
      
      logger.debug(`Pong received from guest: ${guestInfo.userId} (${socketId})`);
      
      // 하트비트도 업데이트
      await this.updateHeartbeat(socketId);
      
      return true;
    }
    
    return false;
  }
  
  /**
   * 주기적 ping 전송 시작
   */
  startPingScheduler() {
    setInterval(() => {
      this.sendPingToAllGuests();
    }, this.pingInterval);
    
    logger.info(`Ping scheduler started - interval: ${this.pingInterval}ms`);
  }
  
  /**
   * 모든 게스트에게 ping 전송
   */
  async sendPingToAllGuests() {
    const now = new Date();
    const pingData = {
      timestamp: now.toISOString(),
      type: 'connection_check'
    };
    
    for (const [socketId, guestInfo] of this.guestConnections) {
      try {
        const socket = this.io.sockets.sockets.get(socketId);
        
        if (socket && socket.connected) {
          // ping 전송
          socket.emit('ping', pingData);
          
          // ping 시간 기록
          guestInfo.lastPing = now;
          guestInfo.missedPings += 1;
          
          logger.debug(`Ping sent to guest: ${guestInfo.userId} (${socketId})`);
        } else {
          // 소켓이 연결되지 않은 경우 정리
          logger.warn(`Socket not connected for guest: ${guestInfo.userId} (${socketId})`);
          await this.unregisterGuest(socketId, 'socket_disconnected');
        }
      } catch (error) {
        logger.error(`Error sending ping to guest ${guestInfo.userId}:`, error);
      }
    }
  }
  
  /**
   * 하트비트 상태 체크 시작
   */
  startHeartbeatChecker() {
    setInterval(() => {
      this.checkConnectionStates();
    }, this.heartbeatInterval);
    
    logger.info(`Heartbeat checker started - interval: ${this.heartbeatInterval}ms`);
  }
  
  /**
   * 연결 상태 확인
   */
  async checkConnectionStates() {
    const now = new Date();
    const timeoutThreshold = new Date(now.getTime() - this.connectionTimeout);
    const maxMissedPings = 3; // 3번의 ping을 놓치면 연결 끊김으로 간주
    
    for (const [socketId, guestInfo] of this.guestConnections) {
      try {
        // 하트비트 타임아웃 체크
        if (guestInfo.lastHeartbeat < timeoutThreshold) {
          logger.warn(`Guest heartbeat timeout: ${guestInfo.userId} (${socketId})`);
          await this.unregisterGuest(socketId, 'heartbeat_timeout');
          continue;
        }
        
        // ping 응답 체크
        if (guestInfo.missedPings >= maxMissedPings) {
          logger.warn(`Guest ping timeout: ${guestInfo.userId} (${socketId}) - missed ${guestInfo.missedPings} pings`);
          await this.unregisterGuest(socketId, 'ping_timeout');
          continue;
        }
        
        // 소켓 연결 상태 체크
        const socket = this.io.sockets.sockets.get(socketId);
        if (!socket || !socket.connected) {
          logger.warn(`Socket disconnected for guest: ${guestInfo.userId} (${socketId})`);
          await this.unregisterGuest(socketId, 'socket_disconnected');
          continue;
        }
        
        // 응답성 상태 업데이트
        guestInfo.isResponsive = guestInfo.missedPings < 2;
        
      } catch (error) {
        logger.error(`Error checking connection state for guest ${guestInfo.userId}:`, error);
      }
    }
  }
  
  /**
   * 주기적 정리 작업 시작
   */
  startPeriodicCleanup() {
    setInterval(() => {
      this.performPeriodicCleanup();
    }, this.cleanupInterval);
    
    logger.info(`Periodic cleanup started - interval: ${this.cleanupInterval}ms`);
  }
  
  /**
   * 주기적 정리 작업 수행
   */
  async performPeriodicCleanup() {
    logger.info('Starting periodic guest cleanup...');
    
    try {
      // Redis에서 만료된 연결 정보 정리
      await this.cleanupExpiredRedisConnections();
      
      // 메모리와 실제 소켓 상태 동기화
      await this.syncConnectionStates();
      
      // DB에서 오래된 게스트 레코드 정리
      await this.cleanupOldGuestRecords();
      
      // 통계 로깅
      this.logConnectionStats();
      
      logger.info('Periodic cleanup completed');
      
    } catch (error) {
      logger.error('Error during periodic cleanup:', error);
    }
  }
  
  /**
   * Redis의 만료된 연결 정보 정리
   */
  async cleanupExpiredRedisConnections() {
    try {
      const keys = await this.redis.keys('guest_connection:*');
      let cleanedCount = 0;
      
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (!data) {
          cleanedCount++;
          continue;
        }
        
        try {
          const connectionInfo = JSON.parse(data);
          const socketId = key.replace('guest_connection:', '');
          
          // 메모리에 없는 연결이면 Redis에서도 제거
          if (!this.guestConnections.has(socketId)) {
            await this.redis.del(key);
            cleanedCount++;
          }
        } catch (parseError) {
          // 잘못된 데이터면 제거
          await this.redis.del(key);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} expired Redis connections`);
      }
    } catch (error) {
      logger.error('Error cleaning up Redis connections:', error);
    }
  }
  
  /**
   * 메모리와 실제 소켓 상태 동기화
   */
  async syncConnectionStates() {
    let syncedCount = 0;
    
    for (const [socketId, guestInfo] of this.guestConnections) {
      const socket = this.io.sockets.sockets.get(socketId);
      
      if (!socket || !socket.connected) {
        await this.unregisterGuest(socketId, 'sync_cleanup');
        syncedCount++;
      }
    }
    
    if (syncedCount > 0) {
      logger.info(`Synced ${syncedCount} connection states`);
    }
  }
  
  /**
   * DB에서 오래된 게스트 레코드 정리
   */
  async cleanupOldGuestRecords() {
    try {
      // 24시간 이상 된 게스트 레코드 정리
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const options = {
        hostname: 'auth-service',
        port: 3001,
        path: `/auth/guest/cleanup?before=${cutoffTime.toISOString()}`,
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      await new Promise((resolve, reject) => {
        const req = httpClient.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode === 200) {
              const result = JSON.parse(data);
              logger.info(`Cleaned up ${result.deletedCount || 0} old guest records`);
            }
            resolve();
          });
        });
        req.on('error', reject);
        req.end();
      });
      
    } catch (error) {
      logger.error('Error cleaning up old guest records:', error);
    }
  }
  
  /**
   * DB에서 게스트 삭제
   */
  async deleteGuestFromDB(userId) {
    try {
      const options = {
        hostname: 'auth-service',
        port: 3001,
        path: `/auth/guest/${userId}`,
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      await new Promise((resolve, reject) => {
        const req = httpClient.request(options, (res) => {
          res.on('data', () => {});
          res.on('end', () => resolve());
        });
        req.on('error', reject);
        req.end();
      });
      
      logger.info(`Guest user deleted from DB: ${userId}`);
    } catch (error) {
      logger.error(`Failed to delete guest user from DB: ${userId}`, error);
    }
  }
  
  /**
   * 연결 통계 로깅
   */
  logConnectionStats() {
    const totalGuests = this.guestConnections.size;
    const responsiveGuests = Array.from(this.guestConnections.values())
      .filter(guest => guest.isResponsive).length;
    
    logger.info(`Connection Stats - Total: ${totalGuests}, Responsive: ${responsiveGuests}, Unresponsive: ${totalGuests - responsiveGuests}`);
  }
  
  /**
   * 특정 게스트 정보 조회
   */
  getGuestInfo(socketId) {
    return this.guestConnections.get(socketId);
  }
  
  /**
   * 모든 게스트 정보 조회
   */
  getAllGuests() {
    return Array.from(this.guestConnections.values());
  }
  
  /**
   * 연결된 게스트 수 조회
   */
  getGuestCount() {
    return this.guestConnections.size;
  }
}

module.exports = GuestConnectionManager;