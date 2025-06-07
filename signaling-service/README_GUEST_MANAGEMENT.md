# 게스트 연결 관리 시스템

VOIP 서버에서 게스트 연결을 효율적으로 관리하기 위한 시스템입니다. 게스트의 연결 끊김을 감지하고 주기적으로 정리하는 기능을 제공합니다.

## 주요 기능

### 🔍 연결 상태 감지
- **실시간 하트비트 모니터링**: 30초마다 연결 상태 확인
- **Ping/Pong 메커니즘**: 1분마다 ping 전송 및 응답 확인
- **연결 타임아웃 감지**: 3분간 응답 없으면 자동 연결 해제

### 🧹 자동 정리 시스템
- **서버 시작 시 정리**: 서버 재시작 시 모든 게스트 데이터 자동 삭제
- **주기적 정리**: 5분마다 자동 정리 작업 수행
- **DB 동기화**: MongoDB에서 게스트 레코드 삭제
- **Redis 정리**: 만료된 연결 정보 정리
- **메모리 정리**: 실제 소켓 상태와 메모리 상태 동기화

### 📊 상태 모니터링
- **연결 통계**: 총 게스트 수, 응답 가능한 게스트 수 등
- **로깅**: 상세한 연결 상태 및 정리 작업 로그
- **Redis 백업**: 연결 정보를 Redis에 백업하여 서버 재시작 시에도 복구 가능

## 설치 및 설정

### 1. 의존성 확인
```bash
# signaling-service 디렉토리에서
npm install ioredis socket.io
```

### 2. 환경 변수 설정
```bash
# .env 파일에 추가
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=12qwaszx
```

### 3. 서버 설정
`signaling-service/src/index.js`에 이미 통합되어 있습니다.

## 사용법

### 서버 측 (자동 실행됨)

```javascript
// GuestConnectionManager는 signaling-service 시작 시 자동으로 초기화됩니다
const guestConnectionManager = new GuestConnectionManager(io);

// 서버 시작 시 자동 정리 (자동)
initializeManager() {
  this.cleanupOnStartup(); // 서버 시작 시 모든 게스트 데이터 삭제
}

// 게스트 등록 (자동)
socket.on('connection', async (socket) => {
  if (socket.isGuest) {
    await guestConnectionManager.registerGuest(socket);
  }
});

// 연결 해제 (자동)
socket.on('disconnect', async () => {
  if (socket.isGuest) {
    await guestConnectionManager.unregisterGuest(socket.id, 'disconnect');
  }
});
```

### 클라이언트 측 (안드로이드 앱)

```javascript
// WebView에서 사용
const connection = connectAsGuest('ws://your-server:3004', 'Guest Name');

// 연결 상태 확인
console.log('Connected:', VoipUtils.isConnected());

// 통화 시작
VoipUtils.startCall('target-guest-id', 'video');

// 연결 해제
VoipUtils.disconnect();
```

## API 엔드포인트

### 게스트 대량 삭제 (서버 시작 시)
```http
DELETE /auth/guest/cleanup-all
```

### 게스트 삭제
```http
DELETE /auth/guest/{guestId}
```

### 오래된 게스트 일괄 정리
```http
DELETE /auth/guest/cleanup?before=2024-01-01T00:00:00Z
```

### User-Service 게스트 정리
```http
DELETE /guests/cleanup-all
DELETE /guests/cleanup?before=2024-01-01T00:00:00Z
```

## 설정 값

| 설정 | 기본값 | 설명 |
|------|--------|------|
| `cleanupInterval` | 5분 | 주기적 정리 작업 간격 |
| `heartbeatInterval` | 30초 | 하트비트 체크 간격 |
| `connectionTimeout` | 3분 | 연결 타임아웃 시간 |
| `pingInterval` | 1분 | Ping 전송 간격 |
| `maxMissedPings` | 3회 | 최대 허용 ping 누락 횟수 |

## 모니터링

### 로그 확인
```bash
# signaling-service 로그
docker-compose logs -f signaling-service

# 연결 통계 확인
grep "Connection Stats" logs/signaling-service.log
```

### Redis 상태 확인
```bash
# Redis CLI 접속
docker exec -it voip_redis redis-cli

# 게스트 연결 정보 확인
KEYS guest_connection:*

# 온라인 유저 확인  
HGETALL users:online
```

## 문제 해결

### 게스트가 자동 삭제되지 않는 경우

1. **Redis 연결 확인**
```bash
docker exec -it voip_redis redis-cli ping
```

2. **auth-service 상태 확인**
```bash
curl http://auth-service:3001/health
```

3. **로그 확인**
```bash
docker-compose logs signaling-service | grep "Guest"
```

### 성능 최적화

1. **Redis 메모리 최적화**
```bash
# Redis 설정에 추가
maxmemory 256mb
maxmemory-policy allkeys-lru
```

2. **로그 레벨 조정**
```bash
# 프로덕션에서는 debug 로그 비활성화
LOG_LEVEL=info
```

## 테스트

### 단위 테스트 실행
```bash
cd signaling-service
npm test -- tests/managers/GuestConnectionManager.test.js
```

### 수동 테스트
```bash
# 게스트 연결 테스트
cd /Users/oms810110naver.com/Dev_work/voip
node test_multi_guest.js

# 연결 끊김 테스트
node guest_load_test.js
```

## 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   클라이언트    │    │ Signaling Server │    │ GuestConnection │
│   (Android)     │◄──►│                 │◄──►│    Manager      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │     Redis       │    │    Auth Service │
                       │  (연결 상태)    │    │   (DB 정리)    │
                       └─────────────────┘    └─────────────────┘
```

## 기여하기

1. 이슈 생성
2. 기능 브랜치 생성: `git checkout -b feature/guest-management`
3. 변경사항 커밋: `git commit -am 'Add guest cleanup feature'`
4. 브랜치 푸시: `git push origin feature/guest-management`
5. Pull Request 생성

## 라이선스

MIT License