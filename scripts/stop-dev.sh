#!/bin/bash

echo "🛑 Stopping VOIP Server Development Environment..."

# 서비스 중지
docker-compose down

# 볼륨 유지 여부 확인
read -p "Do you want to remove volumes? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose down -v
    echo "📦 Volumes removed"
fi

echo "✅ Development environment stopped"
