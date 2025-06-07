#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 스크립트가 있는 디렉토리로 이동
cd "$(dirname "$0")/.."

echo -e "${RED}=================================================${NC}"
echo -e "${RED}     Force Stopping All VoipEx Services${NC}"
echo -e "${RED}=================================================${NC}"

# Docker 실행 확인
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}[ERROR]${NC} Docker is not running!"
    exit 1
fi

echo -e "\n${YELLOW}[WARNING]${NC} This will forcefully stop and remove all containers!"
read -p "Are you sure? (y/N): " confirm

if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}[INFO]${NC} Operation cancelled."
    exit 0
fi

# 모든 VoipEx 관련 컨테이너 찾기
echo -e "\n${YELLOW}[INFO]${NC} Finding all VoipEx containers..."
VOIP_CONTAINERS=$(docker ps -a --filter "name=voip-" --format "{{.Names}}")

if [ -z "$VOIP_CONTAINERS" ]; then
    echo -e "${GREEN}[INFO]${NC} No VoipEx containers found."
else
    echo -e "${YELLOW}[INFO]${NC} Found containers:"
    echo "$VOIP_CONTAINERS"
    
    # 컨테이너 강제 중지
    echo -e "\n${YELLOW}[INFO]${NC} Force stopping containers..."
    echo "$VOIP_CONTAINERS" | xargs -r docker stop -t 0
    
    # 컨테이너 제거
    echo -e "${YELLOW}[INFO]${NC} Removing containers..."
    echo "$VOIP_CONTAINERS" | xargs -r docker rm -f
fi

# docker-compose로도 정리
echo -e "\n${YELLOW}[INFO]${NC} Running docker-compose down..."
docker-compose down --remove-orphans 2>/dev/null || true

# 네트워크 정리
echo -e "${YELLOW}[INFO]${NC} Removing VoipEx network..."
docker network rm voipex_voip-network 2>/dev/null || true

# 최종 확인
echo -e "\n${BLUE}Final check:${NC}"
REMAINING=$(docker ps -a --filter "name=voip-" -q | wc -l)
if [ "$REMAINING" -eq 0 ]; then
    echo -e "${GREEN}[SUCCESS]${NC} All VoipEx containers have been removed."
else
    echo -e "${RED}[WARNING]${NC} Some containers may still exist:"
    docker ps -a --filter "name=voip-"
fi

echo -e "\n${RED}=================================================${NC}"
echo -e "${GREEN}Force stop completed!${NC}"
echo -e "${RED}=================================================${NC}\n"
