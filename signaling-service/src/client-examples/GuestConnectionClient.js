/**
 * 클라이언트 측 게스트 연결 관리 예제
 * 이 코드를 안드로이드 앱의 JavaScript/WebView 부분에 추가하세요
 */

class GuestConnectionHandler {
  constructor(socket) {
    this.socket = socket;
    this.heartbeatInterval = null;
    this.lastPingTime = null;
    this.missedPings = 0;
    this.maxMissedPings = 3;
    
    this.setupPingPongHandlers();
    this.startHeartbeat();
  }
  
  /**
   * Ping/Pong 이벤트 핸들러 설정
   */
  setupPingPongHandlers() {
    // 서버로부터 ping 수신
    this.socket.on('ping', (data) => {
      console.log('Ping received from server:', data);
      this.lastPingTime = new Date(data.timestamp);
      
      // 즉시 pong으로 응답
      this.socket.emit('pong', {
        timestamp: new Date().toISOString(),
        pingTimestamp: data.timestamp,
        type: 'response'
      });
      
      console.log('Pong sent to server');
    });
    
    // 연결 상태 변경 감지
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.missedPings = 0;
      this.startHeartbeat();
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      this.stopHeartbeat();
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });
  }
  
  /**
   * 주기적 하트비트 전송 시작
   */
  startHeartbeat() {
    // 기존 하트비트 정지
    this.stopHeartbeat();
    
    // 30초마다 하트비트 전송
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);
    
    console.log('Heartbeat started');
  }
  
  /**
   * 하트비트 전송 중지
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('Heartbeat stopped');
    }
  }
  
  /**
   * 서버에 하트비트 전송
   */
  sendHeartbeat() {
    if (this.socket.connected) {
      this.socket.emit('heartbeat', {
        timestamp: new Date().toISOString(),
        clientInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform
        }
      });
      
      console.log('Heartbeat sent');
    } else {
      console.warn('Cannot send heartbeat - socket not connected');
    }
  }
  
  /**
   * 연결 상태 확인
   */
  checkConnectionHealth() {
    const now = new Date();
    
    // 마지막 ping으로부터 3분 이상 지났으면 경고
    if (this.lastPingTime && (now - this.lastPingTime) > 3 * 60 * 1000) {
      console.warn('No ping received for over 3 minutes');
      return false;
    }
    
    return true;
  }
  
  /**
   * 연결 해제 처리
   */
  disconnect() {
    this.stopHeartbeat();
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  }
}

// Socket.IO 클라이언트 설정 예제
function initializeGuestConnection(serverUrl, guestInfo) {
  // Socket.IO 연결 설정
  const socket = io(serverUrl, {
    query: {
      userId: guestInfo.userId,
      name: guestInfo.name,
      isGuest: 'true'
    },
    transports: ['websocket', 'polling'],
    timeout: 20000,
    forceNew: true
  });
  
  // 게스트 연결 핸들러 초기화
  const connectionHandler = new GuestConnectionHandler(socket);
  
  // 기본 이벤트 핸들러들
  socket.on('guest-registered', (data) => {
    console.log('Guest registered successfully:', data);
  });
  
  socket.on('guestJoined', (data) => {
    console.log('Another guest joined:', data);
    // UI 업데이트 로직
  });
  
  socket.on('guestLeft', (data) => {
    console.log('Guest left:', data);
    // UI 업데이트 로직
  });
  
  // 통화 관련 이벤트들
  socket.on('incoming-call', (data) => {
    console.log('Incoming call:', data);
    // 통화 수신 처리
  });
  
  socket.on('call-initiated', (data) => {
    console.log('Call initiated:', data);
    // 통화 시작 처리
  });
  
  socket.on('offer', (data) => {
    console.log('Received offer:', data);
    // WebRTC offer 처리
  });
  
  socket.on('answer', (data) => {
    console.log('Received answer:', data);
    // WebRTC answer 처리
  });
  
  socket.on('iceCandidate', (data) => {
    console.log('Received ICE candidate:', data);
    // ICE candidate 처리
  });
  
  return {
    socket,
    connectionHandler,
    
    // 통화 시작
    startCall: (targetUserId, callType = 'audio') => {
      socket.emit('call-user', {
        targetUserId,
        callType,
        callId: `call-${Date.now()}`
      });
    },
    
    // WebRTC offer 전송
    sendOffer: (targetUserId, offer) => {
      socket.emit('offer', {
        to: targetUserId,
        offer: offer
      });
    },
    
    // WebRTC answer 전송
    sendAnswer: (targetUserId, answer) => {
      socket.emit('answer', {
        to: targetUserId,
        answer: answer
      });
    },
    
    // ICE candidate 전송
    sendIceCandidate: (targetUserId, candidate) => {
      socket.emit('ice-candidate', {
        to: targetUserId,
        candidate: candidate
      });
    },
    
    // 연결 종료
    disconnect: () => {
      connectionHandler.disconnect();
    }
  };
}

// Android WebView에서 사용할 때의 예제
// 이 함수를 WebView에서 호출
function connectAsGuest(serverUrl, guestName) {
  const guestId = 'guest_' + Math.random().toString(36).substring(2, 10);
  
  const connection = initializeGuestConnection(serverUrl, {
    userId: guestId,
    name: guestName
  });
  
  // 전역 변수로 설정하여 Android에서 접근 가능하게 함
  window.voipConnection = connection;
  
  return connection;
}

// Android에서 호출할 수 있는 유틸리티 함수들
window.VoipUtils = {
  // 연결 상태 확인
  isConnected: () => {
    return window.voipConnection && window.voipConnection.socket.connected;
  },
  
  // 연결 해제
  disconnect: () => {
    if (window.voipConnection) {
      window.voipConnection.disconnect();
      window.voipConnection = null;
    }
  },
  
  // 통화 시작
  startCall: (targetUserId, callType) => {
    if (window.voipConnection) {
      window.voipConnection.startCall(targetUserId, callType);
    }
  },
  
  // 연결 상태 정보 조회
  getConnectionInfo: () => {
    if (window.voipConnection) {
      return {
        connected: window.voipConnection.socket.connected,
        id: window.voipConnection.socket.id,
        lastPing: window.voipConnection.connectionHandler.lastPingTime
      };
    }
    return null;
  }
};

// 예제 사용법:
/*
// 1. 게스트로 연결
const connection = connectAsGuest('ws://your-server:3004', 'Guest User');

// 2. 다른 게스트에게 통화 걸기
connection.startCall('other-guest-id', 'video');

// 3. 연결 상태 확인
console.log('Connected:', VoipUtils.isConnected());

// 4. 연결 해제
VoipUtils.disconnect();
*/