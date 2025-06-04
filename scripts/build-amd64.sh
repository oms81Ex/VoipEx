#!/bin/bash

# AMD64 플랫폼 설정
export DOCKER_DEFAULT_PLATFORM=linux/amd64

echo "Building all services for AMD64 architecture..."

# 각 서비스 디렉토리에 AMD64 Dockerfile 복사
declare -a services=("api-gateway" "auth-service" "user-service" "call-service" "signaling-service" "media-service" "frontend")

for service in "${services[@]}"; do
    echo "Creating AMD64 Dockerfile for $service..."
    cp "$service/Dockerfile" "$service/Dockerfile.backup" 2>/dev/null || true
    cp "$service/Dockerfile.amd64" "$service/Dockerfile"
done

docker-compose build --no-cache

for service in "${services[@]}"; do
    if [ -f "$service/Dockerfile.backup" ]; then
        mv "$service/Dockerfile.backup" "$service/Dockerfile"
    fi
done

echo "AMD64 build completed!" 