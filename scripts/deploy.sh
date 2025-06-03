#!/bin/bash

# 스크립트가 있는 디렉토리로 이동
cd "$(dirname "$0")/.."

# 아키텍처 확인
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    echo "🔍 Detected ARM64 architecture (M1/M2 Mac)"
    # export DOCKER_DEFAULT_PLATFORM=linux/amd64
    echo "✓ Set default platform to linux/amd64 for compatibility (주석처리됨, ARM64 이미지 사용)"
fi

# 환경 변수 파일 확인
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please create .env file from .env.example"
    exit 1
fi

# Docker 설정 확인
echo "Checking Docker configuration..."
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running!"
    exit 1
fi

# 메모리 설정 확인
if [ "$ARCH" = "arm64" ]; then
    echo "Checking Docker memory allocation..."
    DOCKER_MEMORY=$(docker info | grep "Total Memory" | awk '{print $3}' | sed 's/GiB//')
    if (( $(echo "$DOCKER_MEMORY < 4" | bc -l) )); then
        echo "⚠️  Warning: Docker memory allocation might be too low for Kurento"
        echo "Please allocate at least 4GB of memory to Docker in Docker Desktop preferences"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

# 도커 이미지 빌드 및 컨테이너 실행
echo "🚀 Deploying VOIP Server..."

# 이전 컨테이너 중지 및 삭제
echo "Stopping and removing existing containers..."
docker-compose -f docker-compose.prod.yml down

# Kurento 이미지 별도 풀
if [ "$ARCH" = "arm64" ]; then
    echo "Pre-pulling Kurento image for ARM64 compatibility..."
    docker pull --platform linux/amd64 kurento/kurento-media-server:7.0
fi

# 도커 이미지 빌드
echo "Building docker images..."
docker-compose -f docker-compose.prod.yml build

# 컨테이너 시작
echo "Starting containers..."
docker-compose -f docker-compose.prod.yml up -d

# 배포 완료 확인
echo "Checking deployment status..."
sleep 15  # ARM64에서는 에뮬레이션으로 인해 시작이 더 오래 걸릴 수 있음

# 각 서비스의 상태 확인
services=(
    "voip-nginx"
    "voip-api-gateway"
    "voip-auth-service"
    "voip-user-service"
    "voip-call-service"
    "voip-signaling-service"
    "voip-media-service"
    "voip-kurento"
    "voip-mongodb"
    "voip-redis"
    "voip-turn"
    "voip-prometheus"
    "voip-grafana"
    "voip-frontend"
)

all_running=true
for service in "${services[@]}"; do
    status=$(docker ps --filter "name=$service" --format "{{.Status}}" | grep "Up")
    if [ -z "$status" ]; then
        echo "❌ $service is not running"
        if [ "$service" = "voip-kurento" ]; then
            echo "Checking Kurento logs..."
            docker logs voip-kurento
        fi
        all_running=false
    else
        echo "✅ $service is running"
    fi
done

if [ "$all_running" = true ]; then
    echo "🎉 Deployment completed successfully!"
    if [ "$ARCH" = "arm64" ]; then
        echo "Note: Kurento is running under x86_64 emulation. Performance might be affected."
    fi
else
    echo "⚠️  Some services failed to start. Please check the logs."
    exit 1
fi 