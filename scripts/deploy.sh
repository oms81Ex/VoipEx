#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 스크립트 시작 시 안전 모드 설정
set -euo pipefail  # 에러 발생 시 스크립트 중단
trap 'echo -e "${RED}[ERROR]${NC} An error occurred at line $LINENO. Exiting..."; exit 1' ERR

# 스크립트가 있는 디렉토리로 이동
cd "$(dirname "$0")/.."

# 전역 변수
arch_choice=""
compose_file=""

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 모든 서비스 중지 스크립트 실행
stop_all_services() {
    if [ -f "./scripts/stop-all.sh" ]; then
        echo -e "${YELLOW}=================================================${NC}"
        echo -e "${YELLOW}  Stopping all services before deployment${NC}"
        echo -e "${YELLOW}=================================================${NC}"
        ./scripts/stop-all.sh
        if [ $? -ne 0 ]; then
            log_warning "Failed to stop some services, but continuing..."
        fi
        echo ""
        read -p "Press Enter to continue with deployment..."
        clear
    fi
}

# 서비스 목록
services=(
    "api-gateway"
    "auth-service"
    "user-service"
    "call-service"
    "signaling-service"
    "media-service"
    "room-service"
    "frontend"
)

# 인프라 서비스 목록
infra_services=(
    "nginx"
    "mongodb"
    "redis"
    "kurento"
    "coturn"
    "prometheus"
    "grafana"
)

# 환경 파일 체크
check_env() {
    if [ ! -f .env ]; then
        log_error ".env file not found!"
        echo "Creating .env from .env.example..."
        if [ -f .env.example ]; then
            cp .env.example .env
            log_success ".env file created. Please update it with your configuration."
            exit 1
        else
            log_error ".env.example not found. Please create .env file manually."
            exit 1
        fi
    fi
}

# Docker 상태 체크
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running!"
        echo "Please start Docker Desktop and try again."
        exit 1
    fi
    log_success "Docker is running"
}

# 아키텍처 선택 함수
select_architecture() {
    echo "==============================="
    echo "   VoipEx 배포 아키텍처 선택   "
    echo "==============================="
    echo "1) AMD64 (x86_64) 아키텍처로 배포"
    echo "2) ARM64 (M1/M2 Mac 등)로 배포"
    echo "3) 돌아가기"
    echo "==============================="
    read -p "원하는 배포 방식을 선택하세요 [1-3]: " arch_choice
    
    case $arch_choice in
        1)
            compose_file="docker-compose.yml"
            log_info "AMD64 architecture selected"
            ;;
        2)
            compose_file="docker-compose.prod.yml"
            log_info "ARM64 architecture selected"
            ;;
        3)
            return 1
            ;;
        *)
            log_error "Invalid choice"
            select_architecture
            ;;
    esac
    return 0
}

# 서비스 목록 출력
print_services() {
    echo "==============================="
    echo "  Available Services"
    echo "==============================="
    echo -e "${GREEN}Application Services:${NC}"
    for i in "${!services[@]}"; do
        idx=$((i+1))
        printf "  %2d) %-20s\n" "$idx" "${services[$i]}"
    done
    echo ""
    echo -e "${YELLOW}Infrastructure Services:${NC}"
    for i in "${!infra_services[@]}"; do
        idx=$((i+${#services[@]}+1))
        printf "  %2d) %-20s\n" "$idx" "${infra_services[$i]}"
    done
    echo "==============================="
    echo "   0) All services"
    echo "==============================="
}

# 서비스 선택 함수
select_services() {
    print_services
    read -p "Select services (space-separated numbers): " service_input
    
    selected_services=()
    selected_infra=()
    
    if [[ "$service_input" == "0" ]]; then
        selected_services=("${services[@]}")
        selected_infra=("${infra_services[@]}")
    else
        for idx in $service_input; do
            if [ "$idx" -gt 0 ] && [ "$idx" -le "${#services[@]}" ]; then
                selected_services+=("${services[$((idx-1))]}")
            elif [ "$idx" -gt "${#services[@]}" ] && [ "$idx" -le "$((${#services[@]} + ${#infra_services[@]}))" ]; then
                infra_idx=$((idx - ${#services[@]} - 1))
                selected_infra+=("${infra_services[$infra_idx]}")
            fi
        done
    fi
    
    echo ""
    log_info "Selected services:"
    for s in "${selected_services[@]}"; do
        echo "  - $s"
    done
    for s in "${selected_infra[@]}"; do
        echo "  - $s (infra)"
    done
    echo ""
}

# 캐시 옵션 선택
select_cache_option() {
    echo "==============================="
    echo "  Build Cache Option"
    echo "==============================="
    echo "1) Use cache (faster)"
    echo "2) No cache (clean build)"
    echo "==============================="
    read -p "Select option [1-2]: " cache_choice
    case $cache_choice in
        1)
            use_cache=true
            ;;
        2)
            use_cache=false
            ;;
        *)
            log_warning "Invalid choice. Using cache by default."
            use_cache=true
            ;;
    esac
}

# 빌드 함수
build_services() {
    log_info "Building services for architecture: ${arch_choice}"
    
    if [ "$arch_choice" == "1" ]; then
        # AMD64 빌드
        export DOCKER_DEFAULT_PLATFORM=linux/amd64
        
        # Dockerfile.amd64 복사
        for service in "${selected_services[@]}"; do
            if [ -f "$service/Dockerfile.amd64" ]; then
                log_info "Using AMD64 Dockerfile for $service..."
                cp "$service/Dockerfile" "$service/Dockerfile.backup" 2>/dev/null || true
                cp "$service/Dockerfile.amd64" "$service/Dockerfile"
            fi
        done
        
        # 빌드 실행
        build_args=""
        if [ "$use_cache" = false ]; then
            build_args="--no-cache"
        fi
        
        if [ ${#selected_services[@]} -gt 0 ]; then
            log_info "Building application services..."
            docker-compose -f $compose_file build $build_args ${selected_services[*]}
            if [ $? -eq 0 ]; then
                log_success "Build completed successfully"
            else
                log_error "Build failed"
                exit 1
            fi
        fi
        
        # Dockerfile 복원
        for service in "${selected_services[@]}"; do
            if [ -f "$service/Dockerfile.backup" ]; then
                mv "$service/Dockerfile.backup" "$service/Dockerfile"
            fi
        done
        
    elif [ "$arch_choice" == "2" ]; then
        # ARM64 빌드
        ARCH=$(uname -m)
        if [ "$ARCH" = "arm64" ]; then
            log_info "Checking Docker memory allocation..."
            DOCKER_MEMORY=$(docker info | grep "Total Memory" | awk '{print $3}' | sed 's/GiB//')
            if (( $(echo "$DOCKER_MEMORY < 4" | bc -l) )); then
                log_warning "Docker memory allocation might be too low for Kurento"
                echo "Please allocate at least 4GB of memory to Docker in Docker Desktop preferences"
                read -p "Continue anyway? (y/n) " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    exit 1
                fi
            fi
        fi
        
        # 빌드 실행
        build_args=""
        if [ "$use_cache" = false ]; then
            build_args="--no-cache"
        fi
        
        if [ ${#selected_services[@]} -gt 0 ]; then
            log_info "Building application services..."
            docker-compose -f $compose_file build $build_args ${selected_services[*]}
            if [ $? -eq 0 ]; then
                log_success "Build completed successfully"
            else
                log_error "Build failed"
                exit 1
            fi
        fi
    fi
    
    # 인프라 이미지 pull
    if [ ${#selected_infra[@]} -gt 0 ]; then
        log_info "Pulling infrastructure images..."
        for infra in "${selected_infra[@]}"; do
            case $infra in
                "mongodb")
                    docker pull mongo:4.4
                    ;;
                "redis")
                    docker pull redis:7-alpine
                    ;;
                "kurento")
                    if [ "$arch_choice" == "2" ] && [ "$ARCH" = "arm64" ]; then
                        log_info "Pre-pulling Kurento image for ARM64 compatibility..."
                        docker pull --platform linux/amd64 kurento/kurento-media-server:7.0
                    else
                        docker pull kurento/kurento-media-server:7.0
                    fi
                    ;;
                "coturn")
                    docker pull coturn/coturn:latest
                    ;;
                "prometheus")
                    docker pull prom/prometheus:latest
                    ;;
                "grafana")
                    docker pull grafana/grafana:latest
                    ;;
                "nginx")
                    docker pull nginx:alpine
                    ;;
            esac
        done
        log_success "Infrastructure images pulled"
    fi
}

# 배포 함수
deploy_services() {
    log_info "Deploying services..."
    
    # 모든 선택된 서비스 이름 결합
    all_selected=()
    all_selected+=("${selected_services[@]}")
    all_selected+=("${selected_infra[@]}")
    
    # 기존 컨테이너 중지 및 제거
    if [ ${#all_selected[@]} -gt 0 ]; then
        log_info "Stopping existing containers..."
        docker-compose -f $compose_file stop ${all_selected[*]}
        docker-compose -f $compose_file rm -f ${all_selected[*]}
    fi
    
    # 볼륨 디렉토리 생성
    mkdir -p volumes/{mongodb,redis,recordings}
    
    # 서비스 시작
    log_info "Starting services..."
    docker-compose -f $compose_file up -d ${all_selected[*]}
    
    if [ $? -eq 0 ]; then
        log_success "Services started successfully"
        
        # 상태 확인
        sleep 5
        log_info "Service status:"
        docker-compose -f $compose_file ps ${all_selected[*]}
        
        # 아키텍처 검증 (AMD64인 경우)
        if [ "$arch_choice" == "1" ]; then
            log_info "Verifying AMD64 architecture for selected containers..."
            for service in "${selected_services[@]}"; do
                cname="voip-$service"
                if docker ps --format '{{.Names}}' | grep -q "$cname"; then
                    echo -n "Checking $cname: "
                    arch=$(docker inspect $cname | grep -i architecture | awk -F'"' '{print $4}' | head -1)
                    if [ "$arch" = "amd64" ]; then
                        echo -e "${GREEN}✓ AMD64${NC}"
                    else
                        echo -e "${RED}✗ $arch (NOT AMD64)${NC}"
                    fi
                fi
            done
        fi
        
        # 헬스 체크
        perform_health_check
    else
        log_error "Failed to start services"
        exit 1
    fi
}

# 헬스 체크 함수
perform_health_check() {
    log_info "Performing health check..."
    sleep 10
    
    # API Gateway 체크
    if [[ " ${selected_services[@]} " =~ " api-gateway " ]]; then
        if curl -s http://localhost:3000/health > /dev/null; then
            log_success "API Gateway is healthy"
        else
            log_warning "API Gateway health check failed"
        fi
    fi
    
    # Auth Service 체크
    if [[ " ${selected_services[@]} " =~ " auth-service " ]]; then
        if curl -s http://localhost:3001/health > /dev/null; then
            log_success "Auth Service is healthy"
        else
            log_warning "Auth Service health check failed"
        fi
    fi
    
    # MongoDB 체크
    if [[ " ${selected_infra[@]} " =~ " mongodb " ]]; then
        if docker exec voip-mongodb mongo --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
            log_success "MongoDB is healthy"
        else
            log_warning "MongoDB health check failed"
        fi
    fi
    
    # Redis 체크
    if [[ " ${selected_infra[@]} " =~ " redis " ]]; then
        if docker exec voip-redis redis-cli -a 12qwaszx ping > /dev/null 2>&1; then
            log_success "Redis is healthy"
        else
            log_warning "Redis health check failed"
        fi
    fi
}

# 로그 보기 함수
view_logs() {
    # 먼저 compose file 확인
    if [ -z "$compose_file" ]; then
        compose_file="docker-compose.yml"
    fi
    
    print_services
    read -p "Select service to view logs: " service_num
    
    service_name=""
    if [ "$service_num" -gt 0 ] && [ "$service_num" -le "${#services[@]}" ]; then
        service_name="${services[$((service_num-1))]}"
    elif [ "$service_num" -gt "${#services[@]}" ] && [ "$service_num" -le "$((${#services[@]} + ${#infra_services[@]}))" ]; then
        infra_idx=$((service_num - ${#services[@]} - 1))
        service_name="${infra_services[$infra_idx]}"
    fi
    
    if [ -n "$service_name" ]; then
        log_info "Showing logs for $service_name (Press Ctrl+C to exit)"
        docker-compose -f $compose_file logs -f "$service_name"
    else
        log_error "Invalid service selection"
    fi
}

# 상태 확인 함수
check_status() {
    log_info "Checking service status..."
    
    # compose file 확인
    if [ -z "$compose_file" ]; then
        compose_file="docker-compose.yml"
    fi
    
    docker-compose -f $compose_file ps
    echo ""
    log_info "Container resource usage:"
    docker stats --no-stream
}

# 정리 함수
cleanup() {
    echo "==============================="
    echo "  Cleanup Options"
    echo "==============================="
    echo "1) Stop all services (graceful)"
    echo "2) Force stop all services"
    echo "3) Stop and remove all containers"
    echo "4) Remove all data (volumes)"
    echo "5) Full cleanup (containers + volumes + images)"
    echo "6) Cancel"
    echo "==============================="
    read -p "Select option [1-6]: " cleanup_choice
    
    case $cleanup_choice in
        1)
            if [ -f "./scripts/stop-all.sh" ]; then
                ./scripts/stop-all.sh
            else
                log_info "Stopping all services..."
                docker-compose stop
                log_success "All services stopped"
            fi
            ;;
        2)
            if [ -f "./scripts/force-stop.sh" ]; then
                ./scripts/force-stop.sh
            else
                log_info "Force stopping all services..."
                docker-compose kill
                docker-compose down
                log_success "All services force stopped"
            fi
            ;;
        3)
            log_info "Stopping and removing all containers..."
            docker-compose down --remove-orphans
            log_success "All containers removed"
            ;;
        4)
            log_warning "This will delete all data!"
            read -p "Are you sure? (y/n): " confirm
            if [[ $confirm == "y" ]]; then
                docker-compose down -v
                rm -rf volumes/*
                log_success "All data removed"
            fi
            ;;
        5)
            log_warning "This will remove everything including images!"
            read -p "Are you sure? (y/n): " confirm
            if [[ $confirm == "y" ]]; then
                docker-compose down -v --rmi all
                rm -rf volumes/*
                docker system prune -af
                log_success "Full cleanup completed"
            fi
            ;;
        6)
            log_info "Cleanup cancelled"
            ;;
    esac
}

# 메인 메뉴
main_menu() {
    clear
    echo "========================================"
    echo "     VoipEx Deployment Script v2.0"
    echo "========================================"
    echo "1) Build only"
    echo "2) Deploy only"
    echo "3) Build and Deploy"
    echo "4) View logs"
    echo "5) Check status"
    echo "6) Cleanup"
    echo "7) Exit"
    echo "========================================"
    read -p "Select option [1-7]: " choice
    
    case $choice in
        1)
            check_env
            check_docker
            select_architecture
            if [ $? -eq 0 ]; then
                stop_all_services
                select_services
                select_cache_option
                build_services
            fi
            ;;
        2)
            check_env
            check_docker
            select_architecture
            if [ $? -eq 0 ]; then
                stop_all_services
                select_services
                deploy_services
            fi
            ;;
        3)
            check_env
            check_docker
            select_architecture
            if [ $? -eq 0 ]; then
                stop_all_services
                select_services
                select_cache_option
                build_services
                deploy_services
            fi
            ;;
        4)
            view_logs
            ;;
        5)
            check_status
            ;;
        6)
            cleanup
            ;;
        7)
            log_info "Exiting..."
            exit 0
            ;;
        *)
            log_error "Invalid option"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
    main_menu
}

# 스크립트 시작
main_menu
