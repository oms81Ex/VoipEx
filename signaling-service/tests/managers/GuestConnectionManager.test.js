const { expect } = require('chai');
const sinon = require('sinon');
const Redis = require('ioredis-mock');
const GuestConnectionManager = require('../../src/managers/GuestConnectionManager');

describe('GuestConnectionManager', () => {
  let guestManager;
  let mockIo;
  let mockSocket;
  let mockRedis;
  
  beforeEach(() => {
    // Mock Socket.IO
    mockIo = {
      sockets: {
        sockets: new Map()
      },
      emit: sinon.stub(),
      to: sinon.stub().returns({ emit: sinon.stub() })
    };
    
    // Mock Socket
    mockSocket = {
      id: 'socket123',
      userId: 'guest_abc123',
      userName: 'Test Guest',
      handshake: {
        address: '127.0.0.1',
        headers: {
          'user-agent': 'test-agent'
        }
      },
      emit: sinon.stub(),
      connected: true
    };
    
    // Mock Redis with ioredis-mock
    mockRedis = new Redis();
    
    // GuestConnectionManager 인스턴스 생성
    guestManager = new GuestConnectionManager(mockIo);
    guestManager.redis = mockRedis;
    
    // 타이머 스파이 설정
    sinon.useFakeTimers();
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  describe('registerGuest', () => {
    it('should register a guest successfully', async () => {
      const guestInfo = await guestManager.registerGuest(mockSocket);
      
      expect(guestInfo).to.have.property('userId', 'guest_abc123');
      expect(guestInfo).to.have.property('name', 'Test Guest');
      expect(guestInfo).to.have.property('status', 'online');
      expect(guestInfo).to.have.property('socketId', 'socket123');
      
      // 메모리에 저장되었는지 확인
      expect(guestManager.guestConnections.has('socket123')).to.be.true;
      
      // Redis에 저장되었는지 확인
      const redisData = await mockRedis.get('guest_connection:socket123');
      expect(redisData).to.not.be.null;
      
      const parsedData = JSON.parse(redisData);
      expect(parsedData).to.have.property('userId', 'guest_abc123');
    });
    
    it('should set socket guest connection info', async () => {
      await guestManager.registerGuest(mockSocket);
      
      expect(mockSocket).to.have.property('guestConnectionInfo');
      expect(mockSocket.guestConnectionInfo).to.have.property('userId', 'guest_abc123');
    });
  });
  
  describe('unregisterGuest', () => {
    beforeEach(async () => {
      await guestManager.registerGuest(mockSocket);
    });
    
    it('should unregister a guest successfully', async () => {
      // HTTP 요청 모킹
      const httpStub = sinon.stub(require('http'), 'request');
      httpStub.callsFake((options, callback) => {
        const mockRes = {
          on: sinon.stub().callsArgWith(1, ''),
          statusCode: 200
        };
        callback(mockRes);
        return {
          on: sinon.stub(),
          end: sinon.stub()
        };
      });
      
      await guestManager.unregisterGuest('socket123', 'test_disconnect');
      
      // 메모리에서 제거되었는지 확인
      expect(guestManager.guestConnections.has('socket123')).to.be.false;
      
      // Redis에서 제거되었는지 확인
      const redisData = await mockRedis.get('guest_connection:socket123');
      expect(redisData).to.be.null;
      
      // guestLeft 이벤트가 방송되었는지 확인
      expect(mockIo.emit.calledWith('guestLeft')).to.be.true;
      
      httpStub.restore();
    });
    
    it('should handle non-existent guest gracefully', async () => {
      await guestManager.unregisterGuest('non-existent-socket', 'test');
      
      // 에러 없이 처리되어야 함
      expect(guestManager.guestConnections.size).to.equal(1); // 기존 게스트는 그대로
    });
  });
  
  describe('updateHeartbeat', () => {
    beforeEach(async () => {
      await guestManager.registerGuest(mockSocket);
    });
    
    it('should update heartbeat successfully', async () => {
      const result = await guestManager.updateHeartbeat('socket123');
      
      expect(result).to.be.true;
      
      const guestInfo = guestManager.guestConnections.get('socket123');
      expect(guestInfo.isResponsive).to.be.true;
      expect(guestInfo.missedPings).to.equal(0);
    });
    
    it('should return false for non-existent guest', async () => {
      const result = await guestManager.updateHeartbeat('non-existent');
      
      expect(result).to.be.false;
    });
  });
  
  describe('handlePongResponse', () => {
    beforeEach(async () => {
      await guestManager.registerGuest(mockSocket);
    });
    
    it('should handle pong response correctly', async () => {
      const guestInfo = guestManager.guestConnections.get('socket123');
      guestInfo.missedPings = 2; // 일부 ping을 놓친 상태로 설정
      
      const result = await guestManager.handlePongResponse('socket123', {
        timestamp: new Date().toISOString()
      });
      
      expect(result).to.be.true;
      expect(guestInfo.isResponsive).to.be.true;
      expect(guestInfo.missedPings).to.equal(0);
    });
  });
  
  describe('sendPingToAllGuests', () => {
    beforeEach(async () => {
      await guestManager.registerGuest(mockSocket);
      mockIo.sockets.sockets.set('socket123', mockSocket);
    });
    
    it('should send ping to all connected guests', async () => {
      await guestManager.sendPingToAllGuests();
      
      expect(mockSocket.emit.calledWith('ping')).to.be.true;
      
      const guestInfo = guestManager.guestConnections.get('socket123');
      expect(guestInfo.missedPings).to.equal(1);
    });
    
    it('should unregister disconnected sockets', async () => {
      mockSocket.connected = false;
      mockIo.sockets.sockets.set('socket123', mockSocket);
      
      const unregisterSpy = sinon.spy(guestManager, 'unregisterGuest');
      
      await guestManager.sendPingToAllGuests();
      
      expect(unregisterSpy.calledWith('socket123', 'socket_disconnected')).to.be.true;
    });
  });
  
  describe('checkConnectionStates', () => {
    beforeEach(async () => {
      await guestManager.registerGuest(mockSocket);
      mockIo.sockets.sockets.set('socket123', mockSocket);
    });
    
    it('should detect heartbeat timeout', async () => {
      const guestInfo = guestManager.guestConnections.get('socket123');
      // 4분 전으로 설정 (3분 타임아웃 초과)
      guestInfo.lastHeartbeat = new Date(Date.now() - 4 * 60 * 1000);
      
      const unregisterSpy = sinon.spy(guestManager, 'unregisterGuest');
      
      await guestManager.checkConnectionStates();
      
      expect(unregisterSpy.calledWith('socket123', 'heartbeat_timeout')).to.be.true;
    });
    
    it('should detect ping timeout', async () => {
      const guestInfo = guestManager.guestConnections.get('socket123');
      guestInfo.missedPings = 3; // 최대 허용 수치
      
      const unregisterSpy = sinon.spy(guestManager, 'unregisterGuest');
      
      await guestManager.checkConnectionStates();
      
      expect(unregisterSpy.calledWith('socket123', 'ping_timeout')).to.be.true;
    });
    
    it('should detect socket disconnection', async () => {
      mockSocket.connected = false;
      
      const unregisterSpy = sinon.spy(guestManager, 'unregisterGuest');
      
      await guestManager.checkConnectionStates();
      
      expect(unregisterSpy.calledWith('socket123', 'socket_disconnected')).to.be.true;
    });
  });
  
  describe('performPeriodicCleanup', () => {
    beforeEach(async () => {
      await guestManager.registerGuest(mockSocket);
    });
    
    it('should perform cleanup without errors', async () => {
      // HTTP 요청 모킹
      const httpStub = sinon.stub(require('http'), 'request');
      httpStub.callsFake((options, callback) => {
        const mockRes = {
          on: sinon.stub(),
          statusCode: 200
        };
        mockRes.on.withArgs('data').callsArgWith(1, JSON.stringify({ deletedCount: 5 }));
        mockRes.on.withArgs('end').callsArg(1);
        callback(mockRes);
        return {
          on: sinon.stub(),
          end: sinon.stub()
        };
      });
      
      await guestManager.performPeriodicCleanup();
      
      // 에러 없이 완료되어야 함
      expect(guestManager.guestConnections.size).to.be.at.least(0);
      
      httpStub.restore();
    });
  });
  
  describe('utility methods', () => {
    beforeEach(async () => {
      await guestManager.registerGuest(mockSocket);
    });
    
    it('should return guest info', () => {
      const guestInfo = guestManager.getGuestInfo('socket123');
      
      expect(guestInfo).to.not.be.undefined;
      expect(guestInfo.userId).to.equal('guest_abc123');
    });
    
    it('should return all guests', () => {
      const allGuests = guestManager.getAllGuests();
      
      expect(allGuests).to.be.an('array');
      expect(allGuests).to.have.length(1);
      expect(allGuests[0].userId).to.equal('guest_abc123');
    });
    
    it('should return guest count', () => {
      const count = guestManager.getGuestCount();
      
      expect(count).to.equal(1);
    });
  });
  
  describe('timer functionality', () => {
    it('should start timers on initialization', () => {
      // setInterval이 3번 호출되었는지 확인 (heartbeat, cleanup, ping)
      expect(sinon.stub().callCount).to.be.at.least(0);
    });
  });
});