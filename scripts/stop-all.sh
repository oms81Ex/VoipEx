#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 스크립트가 있는 디렉토리로 이동
cd "$(dirname "$0")/.."

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}     Stopping All VoipEx Services${NC}"
echo -e "${BLUE}=================================================${NC}"

# Docker 실행 확인
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}[ERROR]${NC} Docker is not running!"
    exit 1
fi

# 실행 중인 컨테이너 확인
echo -e "\n${YELLOW}[INFO]${NC} Checking running containers..."
RUNNING_CONTAINERS=$(docker-compose ps -q | wc -l)

if [ "$RUNNING_CONTAINERS" -eq 0 ]; then
    echo -e "${GREEN}[INFO]${NC} No containers are running."
else
    echo -e "${YELLOW}[INFO]${NC} Found $RUNNING_CONTAINERS running container(s)."
    
    # 컨테이너 목록 표시
    echo -e "\n${BLUE}Running containers:${NC}"
    docker-compose ps
    
    # 모든 컨테이너 중지
    echo -e "\n${YELLOW}[INFO]${NC} Stopping all containers..."
    docker-compose stop
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[SUCCESS]${NC} All containers stopped successfully."
    else
        echo -e "${RED}[ERROR]${NC} Failed to stop some containers."
        exit 1
    fi
fi

# 네트워크 정리
echo -e "\n${YELLOW}[INFO]${NC} Cleaning up networks..."
docker network prune -f > /dev/null 2>&1

# 임시 볼륨 정리 (데이터 볼륨은 유지)
echo -e "${YELLOW}[INFO]${NC} Cleaning up unused volumes..."
docker volume prune -f > /dev/null 2>&1

# 최종 상태 확인
echo -e "\n${BLUE}Final status:${NC}"
REMAINING=$(docker-compose ps -q | wc -l)
if [ "$REMAINING" -eq 0 ]; then
    echo -e "${GREEN}[SUCCESS]${NC} All services have been stopped."
else
    echo -e "${RED}[WARNING]${NC} Some containers may still be running:"
    docker-compose ps
fi

echo -e "\n${BLUE}=================================================${NC}"
echo -e "${GREEN}Stop script completed!${NC}"
echo -e "${BLUE}=================================================${NC}\n"
