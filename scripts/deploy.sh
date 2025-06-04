#!/bin/bash

# 스크립트가 있는 디렉토리로 이동
cd "$(dirname "$0")/.."

# 서비스 목록
services=(
    "api-gateway"
    "auth-service"
    "user-service"
    "call-service"
    "signaling-service"
    "media-service"
    "frontend"
)

# 캐시 사용 여부 선택 함수
select_cache_option() {
    echo "==============================="
    echo "  빌드 캐시 사용 여부 선택"
    echo "==============================="
    echo "1) 캐시 사용 (빠른 빌드)"
    echo "2) 전체 재빌드 (캐시 미사용)"
    echo "==============================="
    read -p "선택하세요 [1-2]: " cache_choice
    case $cache_choice in
        1)
            use_cache=true
            ;;
        2)
            use_cache=false
            ;;
        *)
            echo "잘못된 선택입니다. 기본값으로 캐시를 사용합니다."
            use_cache=true
            ;;
    esac
}

# 서비스 선택 함수
select_services() {
    echo "==============================="
    echo "  배포할 서비스 선택 (여러 개: 공백구분)"
    echo "  0) 전체 서비스"
    for i in "${!services[@]}"; do
        idx=$((i+1))
        echo "  $idx) ${services[$i]}"
    done
    echo "==============================="
    read -p "서비스 번호 입력: " service_input
    if [[ "$service_input" == "0" ]]; then
        selected_services=("${services[@]}")
    else
        selected_services=()
        for idx in $service_input; do
            selected_services+=("${services[$((idx-1))]}")
        done
    fi
}

# 아키텍처 선택 함수
select_architecture() {
    clear
    echo "==============================="
    echo "   VoipEx 배포 아키텍처 선택   "
    echo "==============================="
    echo "1) AMD64 (x86_64) 아키텍처로 배포"
    echo "2) ARM64 (M1/M2 Mac 등)로 배포 (기존 방식)"
    echo "3) 종료"
    echo "==============================="
    read -p "원하는 배포 방식을 선택하세요 [1-3]: " arch_choice
}

# 빌드 함수
build_services() {
    if [ "$arch_choice" == "1" ]; then
        export DOCKER_DEFAULT_PLATFORM=linux/amd64
        # Dockerfile.amd64 복사
        for service in "${selected_services[@]}"; do
            echo "Creating AMD64 Dockerfile for $service..."
            cp "$service/Dockerfile" "$service/Dockerfile.backup" 2>/dev/null || true
            cp "$service/Dockerfile.amd64" "$service/Dockerfile"
        done
        if [ "$use_cache" = false ]; then
            echo "전체 재빌드를 시작합니다 (캐시 미사용)..."
            docker-compose build --no-cache ${selected_services[*]}
        else
            echo "캐시를 사용하여 빌드를 시작합니다..."
            docker-compose build ${selected_services[*]}
        fi
        # Dockerfile 복원
        for service in "${selected_services[@]}"; do
            if [ -f "$service/Dockerfile.backup" ]; then
                mv "$service/Dockerfile.backup" "$service/Dockerfile"
            fi
        done
    elif [ "$arch_choice" == "2" ]; then
        if [ ! -f .env ]; then
            echo "Error: .env file not found!"
            echo "Please create .env file from .env.example"
            exit 1
        fi
        echo "Checking Docker configuration..."
        if ! docker info > /dev/null 2>&1; then
            echo "Error: Docker is not running!"
            exit 1
        fi
        ARCH=$(uname -m)
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
        echo "Building docker images..."
        if [ "$use_cache" = false ]; then
            echo "전체 재빌드를 시작합니다 (캐시 미사용)..."
            docker-compose -f docker-compose.prod.yml build --no-cache ${selected_services[*]}
        else
            echo "캐시를 사용하여 빌드를 시작합니다..."
            docker-compose -f docker-compose.prod.yml build ${selected_services[*]}
        fi
    fi
}

# 배포 함수
deploy_services() {
    if [ "$arch_choice" == "1" ]; then
        docker-compose up -d ${selected_services[*]}
        echo "Checking service status..."
        sleep 10
        docker-compose ps
        # 검증
        echo "Verifying AMD64 architecture for selected containers..."
        for service in "${selected_services[@]}"; do
            cname="voip-$service"
            if docker ps --format '{{.Names}}' | grep -q "$cname"; then
                echo -n "Checking $cname: "
                arch=$(docker inspect $cname | grep -i architecture | awk -F'"' '{print $4}' | head -1)
                if [ "$arch" = "amd64" ]; then
                    echo "✓ AMD64"
                else
                    echo "✗ $arch (NOT AMD64)"
                fi
            fi
        done
    elif [ "$arch_choice" == "2" ]; then
        if [ ! -f .env ]; then
            echo "Error: .env file not found!"
            echo "Please create .env file from .env.example"
            exit 1
        fi
        echo "Checking Docker configuration..."
        if ! docker info > /dev/null 2>&1; then
            echo "Error: Docker is not running!"
            exit 1
        fi
        ARCH=$(uname -m)
        echo "🚀 Deploying VOIP Server..."
        echo "Stopping and removing existing containers..."
        docker-compose -f docker-compose.prod.yml down ${selected_services[*]}
        if [ "$ARCH" = "arm64" ]; then
            echo "Pre-pulling Kurento image for ARM64 compatibility..."
            docker pull --platform linux/amd64 kurento/kurento-media-server:7.0
        fi
        echo "Starting containers..."
        docker-compose -f docker-compose.prod.yml up -d ${selected_services[*]}
        echo "Checking deployment status..."
        sleep 10
        docker-compose -f docker-compose.prod.yml ps
    fi
}

# 메인 메뉴

    echo "==============================="
    echo "   VoipEx 배포/빌드 메뉴"
    echo "==============================="
    echo "1) 빌드만"
    echo "2) 배포만"
    echo "3) 빌드+배포"
    echo "4) 종료"
    echo "==============================="
    read -p "원하는 작업을 선택하세요 [1-4]: " action_choice

    case $action_choice in
      1)
        select_architecture
        if [ "$arch_choice" == "3" ]; then exit 0; fi
        select_services
        select_cache_option
        build_services
        ;;
      2)
        select_architecture
        if [ "$arch_choice" == "3" ]; then exit 0; fi
        select_services
        deploy_services
        ;;
      3)
        select_architecture
        if [ "$arch_choice" == "3" ]; then exit 0; fi
        select_services
        select_cache_option
        build_services
        deploy_services
        ;;
      4)
        echo "배포를 종료합니다."
        exit 0
        ;;
      *)
        echo "잘못된 입력입니다. 다시 선택하세요."
        ;;
    esac
 