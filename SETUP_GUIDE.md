# VoipEx 설치 및 배포 가이드 (macOS)

이 가이드는 macOS 환경에서 VoipEx 프로젝트를 설치하고 배포하는 전체 과정을 안내합니다.

## 목차
1. [시스템 요구사항](#1-시스템-요구사항)
2. [사전 준비](#2-사전-준비)
3. [프로젝트 설치](#3-프로젝트-설치)
4. [환경 설정](#4-환경-설정)
5. [서비스 배포](#5-서비스-배포)
6. [서비스 확인](#6-서비스-확인)
7. [문제 해결](#7-문제-해결)

## 1. 시스템 요구사항

### 하드웨어 요구사항
- **CPU:** Intel 또는 Apple Silicon (M1/M2)
- **메모리:** 최소 16GB RAM 권장
- **저장공간:** 최소 10GB 이상의 여유 공간

### 소프트웨어 요구사항
- **운영체제:** macOS Monterey(12.0) 이상
- **필수 소프트웨어:**
  - Git
  - Docker Desktop
  - Homebrew
  - (Apple Silicon Mac) Rosetta 2

## 2. 사전 준비

### Homebrew 설치
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Git 설치
```bash
brew install git
```

### Docker Desktop 설치
1. [Docker Desktop 다운로드 페이지](https://www.docker.com/products/docker-desktop/)에서 macOS 버전 다운로드
2. 다운로드한 .dmg 파일 실행 및 설치
3. Docker Desktop 실행

### Apple Silicon Mac 추가 설정
```bash
# Rosetta 2 설치
softwareupdate --install-rosetta --agree-to-license
```

## 3. 프로젝트 설치

### 프로젝트 클론
```bash
git clone <repository-url>
cd VoipEx
```

## 4. 환경 설정

### 자동 환경 설정 (권장)
```bash
# 스크립트에 실행 권한 부여
chmod +x scripts/setup-env.sh

# 환경 설정 스크립트 실행
./scripts/setup-env.sh
```

이 스크립트는 다음 작업을 자동으로 수행합니다:
- 시스템 환경 확인
- Homebrew 설치 확인 및 업데이트
- Docker 설치 확인
- 필요한 포트 사용 가능 여부 확인
- 환경 변수 파일(.env) 생성
- Docker 설정 최적화
- 스크립트 실행 권한 설정

### 수동 환경 설정 (자동 설정이 실패한 경우)

1. **환경 변수 설정**
   ```bash
   # 루트 디렉토리에 .env 파일 생성
   cat > .env << EOL
   NODE_ENV=development
   DOCKER_DEFAULT_PLATFORM=linux/amd64
   
   # MongoDB
   MONGO_INITDB_ROOT_USERNAME=admin
   MONGO_INITDB_ROOT_PASSWORD=12qwaszx
   
   # Redis
   REDIS_PASSWORD=12qwaszx
   
   # JWT
   JWT_SECRET=your-super-secret-jwt-key
   
   # Grafana
   GF_SECURITY_ADMIN_PASSWORD=12qwaszx
   EOL
   ```

2. **Docker Desktop 설정**
   - Docker Desktop > Settings > Resources
     - Memory: 최소 8GB
     - CPUs: 가능한 많이 할당
   - Apple Silicon Mac의 경우:
     - Features in development > "Use Rosetta for x86/amd64 emulation" 활성화

3. **포트 확인**
   ```bash
   # 사용 중인 포트 확인
   lsof -i :80,443,3000-3006,8888,27017,6379,9090
   ```

## 5. 서비스 배포

### 전체 서비스 배포
```bash
./scripts/deploy.sh
```

### 특정 서비스만 배포
```bash
./scripts/deploy.sh -s <service-name>
```
가능한 서비스 이름:
- api-gateway
- auth-service
- user-service
- call-service
- signaling-service
- media-service
- frontend

## 6. 서비스 확인

### 서비스 포트
- Frontend: http://localhost:8081
- API Gateway: http://localhost:3000
- Auth Service: http://localhost:3001
- User Service: http://localhost:3002
- Call Service: http://localhost:3003
- Signaling Service: http://localhost:3004
- Media Service: http://localhost:3005

### 상태 확인
```bash
# Docker 컨테이너 상태 확인
docker ps

# 로그 확인
docker logs <container-name>
```

## 7. 문제 해결

### 일반적인 문제

1. **Docker 관련 문제**
   ```bash
   # Docker 데몬 재시작
   killall Docker && open /Applications/Docker.app
   ```

2. **포트 충돌**
   ```bash
   # 사용 중인 포트 확인
   lsof -i :<port-number>
   
   # 프로세스 종료
   kill -9 <PID>
   ```

3. **컨테이너 문제**
   ```bash
   # 모든 컨테이너 중지
   docker stop $(docker ps -aq)
   
   # 모든 컨테이너 삭제
   docker rm $(docker ps -aq)
   
   # 모든 이미지 삭제
   docker rmi $(docker images -q)
   
   # 볼륨 삭제
   docker volume prune
   ```

### Apple Silicon 특화 문제

1. **아키텍처 관련 오류**
   ```bash
   # 환경 변수 설정
   export DOCKER_DEFAULT_PLATFORM=linux/amd64
   ```

2. **Rosetta 2 문제**
   ```bash
   # Rosetta 2 재설치
   softwareupdate --install-rosetta --agree-to-license
   ```

### 로그 확인
```bash
# 전체 로그 확인
docker-compose logs

# 특정 서비스 로그
docker-compose logs <service-name>

# 실시간 로그
docker-compose logs -f <service-name>
```

## 지원 및 문의

문제가 지속되거나 추가 지원이 필요한 경우:
1. GitHub Issues를 통해 문제를 보고해주세요
2. 프로젝트 관리자에게 직접 연락하세요

---

이 가이드는 지속적으로 업데이트됩니다. 최신 버전은 저장소에서 확인하실 수 있습니다. 