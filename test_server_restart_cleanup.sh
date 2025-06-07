#!/bin/bash

# 서버 재시작 시 게스트 정리 테스트 스크립트
# 사용법: ./test_server_restart_cleanup.sh

echo "=== 서버 재시작 시 게스트 정리 테스트 ==="

# 색깔 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 서버 URL 설정
AUTH_SERVICE_URL="http://localhost:3001"
USER_SERVICE_URL="http://localhost:3002"
SIGNALING_SERVICE_URL="http://localhost:3004"

echo -e "${YELLOW}1. 현재 게스트 상태 확인${NC}"

# Redis에서 게스트 연결 정보 확인
echo "Redis 게스트 연결 정보:"
docker exec voip_redis redis-cli keys "guest_connection:*" | wc -l

# Redis에서 온라인 게스트 사용자 확인
echo "Redis 온라인 게스트 사용자:"
docker exec voip_redis redis-cli hgetall "users:online" | grep -c "guest_"

# MongoDB에서 게스트 사용자 확인
echo "MongoDB 게스트 사용자 수:"
curl -s "$AUTH_SERVICE_URL/health" > /dev/null
if [ $? -eq 0 ]; then
    echo "Auth-service 연결 OK"
else
    echo -e "${RED}Auth-service 연결 실패${NC}"
fi

echo -e "\n${YELLOW}2. 테스트용 게스트 사용자 생성${NC}"

# 여러 게스트 사용자 생성
for i in {1..5}; do
    echo "게스트 사용자 $i 생성 중..."
    RESPONSE=$(curl -s -X POST "$AUTH_SERVICE_URL/auth/guest" \
        -H "Content-Type: application/json" \
        -d "{\"name\": \"TestGuest$i\"}")
    
    if echo "$RESPONSE" | grep -q "success"; then
        echo -e "${GREEN}게스트 $i 생성 성공${NC}"
    else
        echo -e "${RED}게스트 $i 생성 실패${NC}"
    fi
done

echo -e "\n${YELLOW}3. 생성된 게스트 확인${NC}"

# Redis 확인
echo "Redis 게스트 연결 정보 수:"
docker exec voip_redis redis-cli keys "guest_connection:*" | wc -l

echo "Redis 온라인 게스트 사용자 수:"
docker exec voip_redis redis-cli hgetall "users:online" | grep -c "guest_" || echo "0"

echo -e "\n${YELLOW}4. 서버 재시작 시뮬레이션 (정리 API 직접 호출)${NC}"

# Auth-service 정리 호출
echo "Auth-service 게스트 정리 호출..."
AUTH_CLEANUP_RESPONSE=$(curl -s -X DELETE "$AUTH_SERVICE_URL/auth/guest/cleanup-all")
echo "Auth-service 응답: $AUTH_CLEANUP_RESPONSE"

# User-service 정리 호출
echo "User-service 게스트 정리 호출..."
USER_CLEANUP_RESPONSE=$(curl -s -X DELETE "$USER_SERVICE_URL/guests/cleanup-all")
echo "User-service 응답: $USER_CLEANUP_RESPONSE"

echo -e "\n${YELLOW}5. 정리 후 상태 확인${NC}"

# Redis 확인
echo "정리 후 Redis 게스트 연결 정보 수:"
docker exec voip_redis redis-cli keys "guest_connection:*" | wc -l

echo "정리 후 Redis 온라인 게스트 사용자 수:"
docker exec voip_redis redis-cli hgetall "users:online" | grep -c "guest_" || echo "0"

echo -e "\n${YELLOW}6. 실제 서버 재시작 테스트${NC}"

if [ "$1" = "--restart" ]; then
    echo -e "${RED}경고: 실제 signaling-service를 재시작합니다...${NC}"
    
    # 테스트용 게스트 다시 생성
    echo "테스트용 게스트 재생성..."
    curl -s -X POST "$AUTH_SERVICE_URL/auth/guest" \
        -H "Content-Type: application/json" \
        -d '{"name": "RestartTestGuest"}' > /dev/null
    
    echo "재시작 전 게스트 수:"
    docker exec voip_redis redis-cli hgetall "users:online" | grep -c "guest_" || echo "0"
    
    # Signaling service 재시작
    echo "Signaling-service 재시작 중..."
    docker-compose restart signaling-service
    
    # 재시작 후 대기
    echo "서비스 재시작 대기 (10초)..."
    sleep 10
    
    echo "재시작 후 게스트 수:"
    docker exec voip_redis redis-cli hgetall "users:online" | grep -c "guest_" || echo "0"
    
    echo -e "${GREEN}서버 재시작 테스트 완료${NC}"
else
    echo "실제 서버 재시작을 원하면 '--restart' 옵션을 사용하세요:"
    echo "./test_server_restart_cleanup.sh --restart"
fi

echo -e "\n${GREEN}=== 테스트 완료 ===${NC}"

# 추가 정보
echo -e "\n${YELLOW}추가 확인 명령어:${NC}"
echo "Redis 게스트 키 확인: docker exec voip_redis redis-cli keys \"guest*\""
echo "Redis 온라인 사용자 확인: docker exec voip_redis redis-cli hgetall \"users:online\""
echo "Signaling-service 로그: docker-compose logs -f signaling-service | grep -i guest"