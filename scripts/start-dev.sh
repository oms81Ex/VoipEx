#!/bin/bash

echo "🚀 Starting VOIP Server Development Environment..."

# 환경 변수 파일 확인
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your actual values!"
fi

# Docker 네트워크 생성
docker network create voip-network 2>/dev/null || true

# 기존 컨테이너 정리
echo "🧹 Cleaning up old containers..."
docker-compose down

# 볼륨 디렉토리 권한 설정
echo "📁 Setting up volume directories..."
chmod -R 777 volumes/

# 서비스 시작
echo "🐳 Starting Docker services..."
docker-compose up -d

# 서비스 상태 확인
echo "⏳ Waiting for services to be ready..."
sleep 10

# 헬스체크
echo "🏥 Checking service health..."
services=("api-gateway:3000" "auth-service:3001" "user-service:3002" "call-service:3003" "signaling-service:3004")

for service in "${services[@]}"; do
    IFS=':' read -r name port <<< "$service"
    if curl -f http://localhost:$port/health > /dev/null 2>&1; then
        echo "✅ $name is healthy"
    else
        echo "❌ $name is not responding"
    fi
done

echo ""
echo "📊 Monitoring available at:"
echo "   - Grafana: http://localhost:3006 (admin/12qwaszx)"
echo "   - Prometheus: http://localhost:9090"
echo ""
echo "✨ Development environment is ready!"
echo "📝 View logs: docker-compose logs -f [service-name]"
