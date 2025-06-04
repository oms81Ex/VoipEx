#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 시스템 확인
check_system() {
    log_info "시스템 환경을 확인합니다..."
    
    # OS 확인
    if [[ "$(uname)" != "Darwin" ]]; then
        log_error "이 스크립트는 macOS 전용입니다."
        exit 1
    fi
    
    # Architecture 확인
    ARCH=$(uname -m)
    if [[ "$ARCH" == "arm64" ]]; then
        log_info "Apple Silicon(M1/M2) Mac이 감지되었습니다."
        # Rosetta 2 설치 확인
        if ! /usr/bin/pgrep -q oahd; then
            log_warn "Rosetta 2가 설치되어 있지 않습니다. 설치를 시도합니다..."
            softwareupdate --install-rosetta --agree-to-license
        fi
    else
        log_info "Intel Mac이 감지되었습니다."
    fi
}

# Homebrew 설치 확인 및 설치
setup_homebrew() {
    log_info "Homebrew 설치 상태를 확인합니다..."
    if ! command -v brew &> /dev/null; then
        log_warn "Homebrew가 설치되어 있지 않습니다. 설치를 시도합니다..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    else
        log_info "Homebrew가 이미 설치되어 있습니다."
        brew update
    fi
}

# Docker 설치 확인
check_docker() {
    log_info "Docker 설치 상태를 확인합니다..."
    if ! command -v docker &> /dev/null; then
        log_error "Docker가 설치되어 있지 않습니다."
        log_info "https://www.docker.com/products/docker-desktop/ 에서 Docker Desktop을 설치해주세요."
        exit 1
    fi
    
    # Docker 데몬 실행 확인
    if ! docker info &> /dev/null; then
        log_error "Docker 데몬이 실행되고 있지 않습니다. Docker Desktop을 실행해주세요."
        exit 1
    fi
}

# 필요한 포트 확인
check_ports() {
    log_info "필요한 포트의 사용 가능 여부를 확인합니다..."
    local ports=(80 443 3000 3001 3002 3003 3004 3005 3006 8888 27017 6379 9090)
    local busy_ports=()
    
    for port in "${ports[@]}"; do
        if lsof -i ":$port" &> /dev/null; then
            busy_ports+=($port)
        fi
    done
    
    if [ ${#busy_ports[@]} -ne 0 ]; then
        log_warn "다음 포트가 이미 사용 중입니다: ${busy_ports[*]}"
        log_warn "해당 포트를 사용하는 프로세스를 종료하거나 포트 설정을 변경해주세요."
    else
        log_info "모든 필요 포트가 사용 가능합니다."
    fi
}

# 환경 변수 파일 설정
setup_env_files() {
    log_info "환경 변수 파일을 설정합니다..."
    
    # 루트 .env 파일
    if [ ! -f .env ]; then
        log_info "루트 .env 파일을 생성합니다..."
        cat > .env << EOL
# Global Environment Variables
NODE_ENV=development
DOCKER_DEFAULT_PLATFORM=linux/amd64

# MongoDB
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=12qwaszx

# Redis
REDIS_PASSWORD=12qwaszx

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Grafana
GF_SECURITY_ADMIN_PASSWORD=12qwaszx
EOL
    fi
    
    # 각 서비스별 .env 파일 생성
    local services=("api-gateway" "auth-service" "user-service" "call-service" "signaling-service" "media-service")
    for service in "${services[@]}"; do
        if [ ! -f "$service/.env" ]; then
            log_info "$service/.env 파일을 생성합니다..."
            mkdir -p "$service"
            cat > "$service/.env" << EOL
NODE_ENV=development
EOL
        fi
    done
}

# Docker 설정
setup_docker() {
    log_info "Docker 설정을 확인합니다..."
    
    # ARM64 아키텍처인 경우 Rosetta 2 에뮬레이션 설정
    if [[ "$(uname -m)" == "arm64" ]]; then
        log_info "Docker의 Rosetta 2 에뮬레이션 설정을 확인합니다..."
        if ! grep -q "DOCKER_DEFAULT_PLATFORM=linux/amd64" ~/.zshrc; then
            echo 'export DOCKER_DEFAULT_PLATFORM=linux/amd64' >> ~/.zshrc
            log_info "Docker 기본 플랫폼을 linux/amd64로 설정했습니다."
        fi
    fi
    
    # Docker 리소스 설정 확인
    log_warn "Docker Desktop의 리소스 설정을 확인해주세요:"
    log_warn "- Memory: 최소 8GB 이상 권장"
    log_warn "- CPUs: 가능한 많이 할당"
    log_warn "Docker Desktop > Settings > Resources에서 설정할 수 있습니다."
}

# 스크립트 실행 권한 설정
setup_script_permissions() {
    log_info "스크립트 실행 권한을 설정합니다..."
    chmod +x scripts/*.sh
    chmod +x */deploy.sh 2>/dev/null || true
}

# 메인 실행
main() {
    log_info "VoipEx 환경 설정을 시작합니다..."
    
    check_system
    setup_homebrew
    check_docker
    check_ports
    setup_env_files
    setup_docker
    setup_script_permissions
    
    log_info "환경 설정이 완료되었습니다!"
    log_info "이제 './scripts/deploy.sh'를 실행하여 서비스를 배포할 수 있습니다."
}

main 