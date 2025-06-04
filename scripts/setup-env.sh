#!/bin/bash

set -e

# 1. .env 파일 생성 (존재하지 않으면)
if [ ! -f .env ]; then
  echo "[INFO] .env 파일이 존재하지 않아 새로 생성합니다."
  touch .env
  echo "# 여기에 환경변수를 입력하세요" >> .env
else
  echo "[INFO] .env 파일이 이미 존재합니다."
fi

# 2. (Mac M1/M2) Rosetta 설치
ARCH=$(uname -m)
if [[ "$ARCH" == "arm64" ]]; then
  if ! /usr/bin/pgrep oahd >/dev/null 2>&1; then
    echo "[INFO] Rosetta 2를 설치합니다. (sudo 필요)"
    sudo softwareupdate --install-rosetta --agree-to-license
  else
    echo "[INFO] Rosetta 2가 이미 설치되어 있습니다."
  fi
  echo "[INFO] Docker Desktop > Settings > Features in development > 'Use Rosetta for x86/amd64 emulation on Apple Silicon' 옵션을 꼭 확인하세요."
fi

# 3. Docker 메모리 안내
if command -v docker >/dev/null 2>&1; then
  MEM=$(docker info 2>/dev/null | grep 'Total Memory' | awk '{print $3}')
  echo "[INFO] 현재 Docker 할당 메모리: ${MEM:-Unknown} (Kurento 등 미디어 서버는 8GB 이상 권장)"
else
  echo "[WARN] Docker가 설치되어 있지 않거나 실행 중이 아닙니다."
fi

# 4. scripts/*.sh 실행 권한 부여
chmod +x scripts/*.sh

# 5. 완료 안내
cat <<EOM

[SETUP 완료]
- .env 파일, Rosetta, 실행권한, Docker 메모리 등 기본 환경이 준비되었습니다.
- 반드시 Docker Desktop이 실행 중인지 확인하세요.
- Mac M1/M2는 Rosetta 옵션 및 메모리 설정을 꼭 확인하세요.
- 이제 'bash scripts/deploy.sh'로 배포를 시작할 수 있습니다.
EOM 