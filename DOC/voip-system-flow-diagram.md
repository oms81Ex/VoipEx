# VOIP 시스템 통합 플로우 다이어그램

## 1. 시스템 전체 구조도

```mermaid
graph TB
    subgraph "Android Client"
        A[Android App]
        A1[WebRTC Engine]
        A2[Socket.io Client]
        A3[Local Database]
    end
    
    subgraph "Load Balancer"
        LB[Nginx]
    end
    
    subgraph "Backend Services"
        B1[API Gateway]
        B2[Auth Service]
        B3[User Service]
        B4[Call Service]
        B5[Signaling Service]
        B6[Media Service]
    end
    
    subgraph "Infrastructure"
        C1[MongoDB]
        C2[Redis]
        C3[Kurento/Janus]
        C4[STUN/TURN]
    end
    
    A --> LB
    LB --> B1
    B1 --> B2
    B1 --> B3
    B1 --> B4
    A2 -.->|WebSocket| B5
    A1 -.->|WebRTC| C3
    A1 -.->|ICE| C4
    
    B2 --> C1
    B2 --> C2
    B3 --> C1
    B4 --> C1
    B5 --> C2
    B6 --> C3
```

## 2. 사용자 인증 플로우

```mermaid
sequenceDiagram
    participant Client as Android Client
    participant LB as Load Balancer
    participant Gateway as API Gateway
    participant Auth as Auth Service
    participant DB as MongoDB
    participant Redis as Redis
    
    Client->>LB: POST /api/auth/login
    LB->>Gateway: Forward Request
    Gateway->>Auth: Validate Credentials
    Auth->>DB: Check User
    DB-->>Auth: User Data
    Auth->>Auth: Generate JWT
    Auth->>Redis: Store Session
    Auth-->>Gateway: JWT Token
    Gateway-->>LB: Response
    LB-->>Client: Login Success + Token
    
    Note over Client: Store Token in Encrypted Storage
    
    Client->>Client: Subsequent Requests
    Note right of Client: Add Bearer Token to Headers
```

## 3. 통화 시작 플로우

```mermaid
sequenceDiagram
    participant A as Client A
    participant SS as Signaling Server
    participant CS as Call Service
    participant B as Client B
    participant MS as Media Server
    
    rect rgb(200, 200, 255)
        Note over A,B: 1. 통화 시작 단계
        A->>SS: Connect WebSocket
        B->>SS: Connect WebSocket
        
        A->>CS: POST /api/calls/initiate
        CS->>CS: 상태 확인
        CS-->>A: callId 반환
        
        A->>SS: call-user (targetUserId, offer)
        SS->>B: incoming-call (callerId, offer)
    end
    
    rect rgb(200, 255, 200)
        Note over A,B: 2. 통화 수락 단계
        B->>B: 수락 UI 표시
        B->>SS: accept-call (answer)
        SS->>A: call-accepted (answer)
        
        Note over A,B: 3. ICE Negotiation
        A->>SS: ice-candidate
        SS->>B: ice-candidate
        B->>SS: ice-candidate
        SS->>A: ice-candidate
    end
    
    rect rgb(255, 200, 200)
        Note over A,B: 4. 미디어 스트림 연결
        A->>MS: Create Pipeline
        B->>MS: Join Pipeline
        MS->>MS: Connect Endpoints
        
        A-.->B: P2P Media Stream
        B-.->A: P2P Media Stream
    end
```

## 4. WebRTC 연결 상세 플로우

```mermaid
graph LR
    subgraph "Client A"
        A1[getUserMedia]
        A2[createPeerConnection]
        A3[addLocalStream]
        A4[createOffer]
        A5[setLocalDescription]
    end
    
    subgraph "Signaling"
        S1[Exchange SDP]
        S2[Exchange ICE]
    end
    
    subgraph "Client B"
        B1[getUserMedia]
        B2[createPeerConnection]
        B3[addLocalStream]
        B4[createAnswer]
        B5[setLocalDescription]
        B6[setRemoteDescription]
    end
    
    A1 --> A2
    A2 --> A3
    A3 --> A4
    A4 --> A5
    A5 --> S1
    
    S1 --> B6
    B1 --> B2
    B2 --> B3
    B6 --> B4
    B4 --> B5
    B5 --> S1
    
    S1 --> A2
    A2 -.-> S2
    B2 -.-> S2
    S2 -.-> A2
    S2 -.-> B2
```

## 5. 통화 종료 플로우

```mermaid
sequenceDiagram
    participant Client as Android Client
    participant SS as Signaling Server
    participant CS as Call Service
    participant MS as Media Server
    participant DB as MongoDB
    
    Client->>SS: end-call (roomId)
    SS->>SS: 통화 상태 확인
    
    par 미디어 정리
        SS->>MS: Release Pipeline
        MS->>MS: Stop Recording
        MS-->>SS: Released
    and 데이터 저장
        SS->>CS: Save Call History
        CS->>DB: Insert Call Record
        DB-->>CS: Success
    end
    
    SS->>Client: call-ended
    Client->>Client: Close PeerConnection
    Client->>Client: Release Resources
```

## 6. 오류 처리 플로우

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Connecting: initiateCall()
    
    Connecting --> Connected: onConnected
    Connecting --> Error: onError
    Connecting --> Timeout: 30s timeout
    
    Connected --> InCall: mediaConnected
    Connected --> Error: connectionFailed
    
    InCall --> Reconnecting: connectionLost
    InCall --> Ended: endCall()
    
    Reconnecting --> InCall: reconnected
    Reconnecting --> Error: reconnectFailed
    
    Error --> Idle: retry/cancel
    Timeout --> Idle: timeout
    Ended --> Idle: callEnded
    
    state Error {
        [*] --> NetworkError
        [*] --> PermissionError
        [*] --> ServerError
        [*] --> MediaError
    }
```

## 7. 푸시 알림을 통한 수신 통화 플로우

```mermaid
sequenceDiagram
    participant Caller as Caller Client
    participant Server as Backend Server
    participant FCM as FCM/APNs
    participant Callee as Callee Client
    participant App as Callee App
    
    Note over Callee: App in Background/Killed
    
    Caller->>Server: Initiate Call
    Server->>Server: Check Callee Status
    
    alt Callee Offline
        Server->>FCM: Send Push Notification
        FCM->>Callee: Push Notification
        Callee->>App: Launch App
        App->>App: Show Incoming Call UI
        App->>Server: Connect WebSocket
        Server->>Caller: User Coming Online
    else Callee Online
        Server->>Callee: incoming-call event
        Callee->>Callee: Show Incoming Call UI
    end
    
    Callee->>Server: Accept/Reject Call
    Server->>Caller: Call Response
```

## 8. 네트워크 품질 적응 플로우

```mermaid
graph TD
    A[Monitor Network Quality] --> B{Network Type}
    
    B -->|WiFi| C[Check Signal Strength]
    B -->|4G/5G| D[Check Bandwidth]
    B -->|3G| E[Low Quality Mode]
    
    C --> F{RSSI Level}
    F -->|Strong > -50dBm| G[High Quality]
    F -->|Medium -70 to -50dBm| H[Medium Quality]
    F -->|Weak < -70dBm| I[Low Quality]
    
    D --> J{Bandwidth}
    J -->|> 5Mbps| G
    J -->|2-5Mbps| H
    J -->|< 2Mbps| I
    
    G --> K[1080p 30fps]
    H --> L[720p 24fps]
    I --> M[480p 15fps]
    E --> M
    
    K --> N[Apply Settings]
    L --> N
    M --> N
    
    N --> O[Update Peer Connection]
    O --> P[Notify Remote Peer]
```

## 9. 데이터 동기화 플로우

```mermaid
sequenceDiagram
    participant App as Android App
    participant Local as Local DB
    participant API as Backend API
    participant Remote as Remote DB
    
    loop Every App Launch
        App->>Local: Get Last Sync Time
        App->>API: GET /sync/changes?since={timestamp}
        API->>Remote: Query Changes
        Remote-->>API: Changed Data
        API-->>App: Sync Response
        App->>Local: Update Local DB
        App->>Local: Update Sync Time
    end
    
    Note over App,Local: Offline Changes
    App->>Local: Store Changes with Pending Flag
    
    alt When Online
        App->>Local: Get Pending Changes
        App->>API: POST /sync/upload
        API->>Remote: Apply Changes
        Remote-->>API: Success
        API-->>App: Sync Complete
        App->>Local: Clear Pending Flag
    end
```

## 10. 보안 통신 플로우

```mermaid
sequenceDiagram
    participant Client as Android Client
    participant CDN as CDN/Proxy
    participant LB as Load Balancer
    participant Server as Backend Server
    
    Note over Client,Server: HTTPS/WSS Communication
    
    Client->>Client: Generate Request
    Client->>Client: Add JWT Token
    Client->>CDN: HTTPS Request
    
    CDN->>CDN: SSL Termination
    CDN->>CDN: Check Cache
    
    alt Cache Miss
        CDN->>LB: Forward Request
        LB->>LB: SSL Re-encryption
        LB->>Server: Process Request
        Server->>Server: Verify JWT
        Server->>Server: Process Business Logic
        Server-->>LB: Response
        LB-->>CDN: Forward Response
        CDN->>CDN: Cache Response
    end
    
    CDN-->>Client: HTTPS Response
    
    Note over Client,Server: WebRTC Media Encryption
    Client->>Client: DTLS Handshake
    Client->>Server: Encrypted Media Stream
```

## 11. 모니터링 및 분석 플로우

```mermaid
graph TB
    subgraph "Client Side"
        A[Android App]
        A1[Analytics SDK]
        A2[Crash Reporter]
        A3[Performance Monitor]
    end
    
    subgraph "Server Side"
        B[API Services]
        B1[Access Logs]
        B2[Application Logs]
        B3[Metrics Collector]
    end
    
    subgraph "Monitoring Stack"
        C1[Filebeat]
        C2[Logstash]
        C3[Elasticsearch]
        C4[Kibana]
        C5[Prometheus]
        C6[Grafana]
        C7[Alert Manager]
    end
    
    A1 --> C1
    A2 --> C1
    A3 --> C5
    
    B1 --> C1
    B2 --> C1
    B3 --> C5
    
    C1 --> C2
    C2 --> C3
    C3 --> C4
    
    C5 --> C6
    C5 --> C7
    
    C7 -->|Alert| D[DevOps Team]
    C7 -->|SMS/Email| E[On-Call Engineer]
```

## 12. 장애 복구 플로우

```mermaid
stateDiagram-v2
    [*] --> Normal: System Start
    
    Normal --> Degraded: Component Failure
    Normal --> Critical: Multiple Failures
    
    Degraded --> Recovery: Auto Healing
    Degraded --> Critical: Cascade Failure
    
    Critical --> Emergency: Manual Intervention
    Critical --> Recovery: Auto Recovery
    
    Recovery --> Normal: Recovered
    Recovery --> Degraded: Partial Recovery
    
    Emergency --> Recovery: Fixed
    Emergency --> Maintenance: Planned Downtime
    
    Maintenance --> Normal: Maintenance Complete
    
    state Normal {
        [*] --> Healthy
        Healthy --> Monitoring
        Monitoring --> Healthy
    }
    
    state Degraded {
        [*] --> ReducedCapacity
        ReducedCapacity --> Failover
        Failover --> LoadBalance
    }
    
    state Recovery {
        [*] --> Detecting
        Detecting --> Analyzing
        Analyzing --> Healing
        Healing --> Verifying
    }
```

## 13. 확장성 관리 플로우

```mermaid
graph LR
    subgraph "Auto Scaling"
        A[Metrics Collection]
        B[Scaling Decision]
        C[Scale Out/In]
    end
    
    subgraph "Load Distribution"
        D[Load Balancer]
        E1[Server Instance 1]
        E2[Server Instance 2]
        E3[Server Instance N]
    end
    
    subgraph "Data Layer"
        F1[MongoDB Primary]
        F2[MongoDB Secondary]
        F3[MongoDB Secondary]
        G[Redis Cluster]
    end
    
    A -->|CPU > 70%| B
    A -->|Memory > 80%| B
    A -->|Connections > 1000| B
    
    B -->|Scale Out| C
    C --> E3
    
    D --> E1
    D --> E2
    D --> E3
    
    E1 --> F1
    E2 --> F2
    E3 --> F3
    
    E1 --> G
    E2 --> G
    E3 --> G
```

## 14. CI/CD 파이프라인 플로우

```mermaid
graph TD
    A[Developer Push] --> B[GitHub]
    B --> C[GitHub Actions]
    
    C --> D[Build & Test]
    D --> E{Tests Pass?}
    
    E -->|No| F[Notify Developer]
    F --> A
    
    E -->|Yes| G[Build Docker Images]
    G --> H[Push to Registry]
    
    H --> I{Branch?}
    I -->|develop| J[Deploy to Dev]
    I -->|staging| K[Deploy to Staging]
    I -->|main| L[Deploy to Production]
    
    J --> M[Smoke Tests]
    K --> N[Integration Tests]
    L --> O[Health Checks]
    
    M --> P[Monitoring]
    N --> P
    O --> P
    
    P --> Q{Issues?}
    Q -->|Yes| R[Rollback]
    Q -->|No| S[Complete]
```

## 15. 통합 시스템 상태 플로우

```mermaid
graph TB
    subgraph "Android Client States"
        AC1[Idle]
        AC2[Authenticating]
        AC3[Online]
        AC4[In Call]
        AC5[Background]
    end
    
    subgraph "Server States"
        SS1[User Offline]
        SS2[User Online]
        SS3[User Busy]
        SS4[Call Active]
    end
    
    subgraph "Media States"
        MS1[No Media]
        MS2[Connecting]
        MS3[Connected]
        MS4[Recording]
    end
    
    AC1 -->|Login| AC2
    AC2 -->|Success| AC3
    AC3 -->|Make Call| AC4
    AC4 -->|End Call| AC3
    AC3 -->|App Background| AC5
    AC5 -->|App Foreground| AC3
    
    SS1 -->|User Login| SS2
    SS2 -->|Start Call| SS3
    SS3 -->|Call Connected| SS4
    SS4 -->|Call Ended| SS2
    SS2 -->|User Logout| SS1
    
    MS1 -->|Call Start| MS2
    MS2 -->|WebRTC Connected| MS3
    MS3 -->|Start Record| MS4
    MS4 -->|Stop Record| MS3
    MS3 -->|Call End| MS1
```

---

## 시스템 통합 요약

### 주요 통합 포인트

1. **클라이언트-서버 통신**
   - RESTful API (HTTPS)
   - WebSocket (실시간 시그널링)
   - WebRTC (P2P 미디어)

2. **인증 및 세션 관리**
   - JWT 기반 인증
   - Redis 세션 스토어
   - 자동 토큰 갱신

3. **실시간 통신**
   - Socket.io 양방향 통신
   - Redis Pub/Sub 이벤트 브로커
   - WebRTC 미디어 스트림

4. **데이터 일관성**
   - MongoDB 트랜잭션
   - 낙관적 동시성 제어
   - 이벤트 소싱 패턴

5. **고가용성**
   - 로드 밸런싱
   - 자동 장애 복구
   - 서비스 메시 아키텍처

### 성능 최적화 전략

1. **클라이언트 최적화**
   - 배터리 소비 최소화
   - 네트워크 적응형 품질
   - 로컬 캐싱

2. **서버 최적화**
   - 수평적 확장
   - 캐싱 전략
   - 데이터베이스 인덱싱

3. **네트워크 최적화**
   - CDN 활용
   - 압축 및 최소화
   - Connection Pooling

### 보안 고려사항

1. **전송 보안**
   - TLS 1.3
   - Certificate Pinning
   - DTLS for WebRTC

2. **애플리케이션 보안**
   - JWT 토큰 관리
   - 입력 검증
   - Rate Limiting

3. **데이터 보안**
   - 암호화된 저장소
   - E2E 암호화
   - GDPR 준수