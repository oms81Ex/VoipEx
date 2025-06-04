#!/bin/bash

# 텍스트 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}미디어 서비스 배포 메뉴${NC}"
echo "=========================="
echo "1. 전체 재빌드 후 배포"
echo "2. 캐시 사용하여 배포"
echo "3. 종료"
echo "=========================="
echo -n "선택하세요 (1-3): "
read choice

case $choice in
    1)
        echo -e "${GREEN}전체 재빌드를 시작합니다...${NC}"
        docker build --no-cache -t media-service .
        ;;
    2)
        echo -e "${GREEN}캐시를 사용하여 빌드를 시작합니다...${NC}"
        docker build -t media-service .
        ;;
    3)
        echo "프로그램을 종료합니다."
        exit 0
        ;;
    *)
        echo "잘못된 선택입니다. 1-3 중에서 선택해주세요."
        exit 1
        ;;
esac

# 빌드 성공 여부 확인
if [ $? -eq 0 ]; then
    echo -e "${GREEN}빌드가 성공적으로 완료되었습니다.${NC}"
    
    echo -n "컨테이너를 시작하시겠습니까? (y/n): "
    read start_container
    
    if [ "$start_container" = "y" ] || [ "$start_container" = "Y" ]; then
        # 기존 컨테이너 중지 및 제거
        echo "기존 컨테이너를 중지하고 제거합니다..."
        docker stop media-service 2>/dev/null
        docker rm media-service 2>/dev/null
        
        # 새 컨테이너 시작
        echo "새 컨테이너를 시작합니다..."
        docker run -d --name media-service -p 3004:3004 media-service
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}컨테이너가 성공적으로 시작되었습니다.${NC}"
            echo "컨테이너 로그 확인: docker logs media-service"
        else
            echo "컨테이너 시작 중 오류가 발생했습니다."
        fi
    else
        echo "컨테이너 시작을 건너뜁니다."
    fi
else
    echo "빌드 중 오류가 발생했습니다."
    exit 1
fi 