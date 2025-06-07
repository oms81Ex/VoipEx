# VoipEx 배포 가이드

## 개요
VoipEx는 WebRTC 기반의 음성/영상 통화 서비스입니다. 이 가이드는 모든 서비스를 빌드하고 배포하는 방법을 설명합니다.

## 시스템 요구사항
- Docker 20.10.0 이상
- Docker Compose 2.0.0 이상
- 최소 8GB RAM (권장 16GB)
- 최소 20GB 여유 디스크 공간

## 서비스 구성

### 애플리케이션 서비스
1. **api-gateway** (포트 3000) - API 게이트웨이
2. **auth-service** (포트 3001) - 인증 서비스
3. **user-service** (포트 3002) - 사용자 서비스
4. **call-service** (포트 3003) - 통화 서비스
5. **signaling-service** (포트 3004) - WebRTC 시그널링 서비스
6. **media-service** (포트 3005) - 미디어 처리 서비스
7. **room-service** (포트 3006) - 룸 관리 서비스
8. **frontend** (포트 8081) - 웹 프론트엔드

### 인프라 서비스
1. **nginx** - 리버스 프록시
2. **mongodb** - 데이터베이스
3. **redis** - 캐시 및 메시지 브로커
4. **kurento** - 미디어 서버
5. **coturn** - TURN 서버
6. **prometheus** - 모니터링
7. **grafana** - 모니터링 대시보드

## 빠른 시작

### 방법 1: Quick Start 스크립트 사용 (추천)
```bash
# 실행 권한 부여
chmod +x scripts/*.sh

# 빠른 시작 (모든 서비스 자동 실행)
./scripts/quick-start.sh
```

### 방법 2: Deploy 스크립트 사용 (상세 설정)
```bash
# 환경 파일 복사 (필요한 경우)
cp .env.example .env

# .env 파일을 열어 필요한 설정 수정
nano .env

# 배포 스크립트 실행
./scripts/deploy.sh
```

**주의**: deploy.sh는 실행 시 자동으로 모든 서비스를 중지하고 시작합니다.

### 3. 모든 서비스 빌드 및 배포
- 메뉴에서 "3) Build and Deploy" 선택
- 서비스 선택에서 "0) All services" 입력
- 캐시 옵션 선택 (첫 빌드는 2번 권장)

## 상세 사용법

### 특정 서비스만 배포
```bash
./scripts/deploy.sh
# 메뉴에서 서비스 번호를 공백으로 구분하여 입력
# 예: 1 2 3 (api-gateway, auth-service, user-service만 배포)
```

### 로그 확인
```bash
./scripts/deploy.sh
# 4) View logs 선택
# 확인하고 싶은 서비스 번호 입력
```

### 서비스 상태 확인
```bash
./scripts/deploy.sh
# 5) Check status 선택
```

### 정리
```bash
./scripts/deploy.sh
# 6) Cleanup 선택
# 원하는 정리 옵션 선택
```

## 서비스별 접속 URL

### 개발 환경
- API Gateway: http://localhost:3000
- Frontend: http://localhost:8081
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3007 (admin/12qwaszx)

### API 문서
- Swagger UI: http://localhost:3000/api-docs

## 스크립트 설명

### 배포 관련 스크립트

1. **deploy.sh** - 메인 배포 스크립트
   - 모든 서비스 빌드/배포/관리
   - 실행 시 자동으로 모든 서비스 중지 후 시작
   - 대화형 메뉴 제공

2. **quick-start.sh** - 빠른 시작 스크립트
   - 모든 서비스를 한 번에 실행
   - 개발 환경에서 빠른 테스트용

3. **stop-all.sh** - 모든 서비스 정상 종료
   - Graceful shutdown
   - 컨테이너 상태 확인 후 종료

4. **force-stop.sh** - 모든 서비스 강제 종료
   - 응답하지 않는 컨테이너 강제 종료
   - 모든 VoipEx 관련 컨테이너 제거

### 사용 예제

```bash
# 모든 서비스 시작
./scripts/quick-start.sh

# 모든 서비스 중지
./scripts/stop-all.sh

# 문제 발생 시 강제 종료
./scripts/force-stop.sh

# 상세 배포 및 관리
./scripts/deploy.sh
```

## 문제 해결

### Docker 메모리 부족
Docker Desktop 설정에서 메모리를 최소 4GB 이상 할당

### 포트 충돌
이미 사용 중인 포트가 있다면 docker-compose.yml에서 포트 변경

### 빌드 실패
```bash
# 캐시 없이 재빌드
docker-compose build --no-cache

# 또는 deploy.sh에서 "No cache" 옵션 선택
```

### 컨테이너 재시작
```bash
docker-compose restart [서비스명]
```

## 모니터링

### Grafana 대시보드
1. http://localhost:3007 접속
2. 로그인 (admin/12qwaszx)
3. Dashboards > Browse에서 대시보드 확인

### 로그 집계
```bash
# 모든 서비스 로그
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f [서비스명]
```

## 백업

### 데이터 백업
```bash
# MongoDB 백업
docker exec voip-mongodb mongodump --out /data/backup

# 볼륨 백업
tar -czf backup-$(date +%Y%m%d).tar.gz volumes/
```

## 업데이트

### 서비스 업데이트
```bash
# 코드 변경 후
git pull origin main

# 서비스 재빌드 및 재시작
./scripts/deploy.sh
# 3) Build and Deploy 선택
```

## 보안 권장사항

1. `.env` 파일의 기본 비밀번호 변경
2. 프로덕션 환경에서는 HTTPS 설정
3. 방화벽 규칙 설정
4. 정기적인 보안 업데이트

## 기술 지원

문제가 발생하면 다음을 확인하세요:
1. `docker-compose logs [서비스명]`으로 로그 확인
2. `docker-compose ps`로 서비스 상태 확인
3. GitHub Issues에 문제 보고
