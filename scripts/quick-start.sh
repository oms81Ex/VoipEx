#!/bin/bash

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}     VoipEx Quick Start${NC}"
echo -e "${BLUE}=================================================${NC}"

# 스크립트가 있는 디렉토리로 이동
cd "$(dirname "$0")/.."

# stop-all.sh 실행
echo -e "\n${BLUE}[1/3]${NC} Stopping existing services..."
if [ -f "./scripts/stop-all.sh" ]; then
    ./scripts/stop-all.sh
fi

# 환경 파일 확인
echo -e "\n${BLUE}[2/3]${NC} Checking environment..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}[INFO]${NC} Created .env file from .env.example"
    fi
fi

# Docker Compose 실행
echo -e "\n${BLUE}[3/3]${NC} Starting all services..."

# 아키텍처 확인
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    # ARM64 (M1/M2 Mac)
    docker-compose -f docker-compose.prod.yml up -d
else
    # AMD64
    docker-compose up -d
fi

# 상태 확인
echo -e "\n${BLUE}Waiting for services to start...${NC}"
sleep 10

echo -e "\n${BLUE}Service Status:${NC}"
docker-compose ps

echo -e "\n${BLUE}=================================================${NC}"
echo -e "${GREEN}Quick start completed!${NC}"
echo -e "\n${BLUE}Access URLs:${NC}"
echo -e "  - API Gateway: http://localhost:3000"
echo -e "  - Frontend: http://localhost:8081"
echo -e "  - Grafana: http://localhost:3007 (admin/12qwaszx)"
echo -e "\n${BLUE}To view logs:${NC} docker-compose logs -f [service-name]"
echo -e "${BLUE}To stop all:${NC} ./scripts/stop-all.sh"
echo -e "${BLUE}=================================================${NC}\n"
