# VoipEx

# VoipEx AMD64 Docker 실행 가이드

## AMD64 환경에서 실행

1. AMD64 빌드

```bash
bash scripts/build-amd64.sh
```

2. AMD64 이미지로 서비스 실행

```bash
bash scripts/run-amd64.sh
```

3. 컨테이너 아키텍처 검증

```bash
bash scripts/verify-amd64.sh
```

## M1/M2(Mac)에서 AMD64 실행 시 주의사항

- Docker Desktop > Settings > Features in development > "Use Rosetta for x86/amd64 emulation on Apple Silicon" 활성화
- 또는 환경 변수 사용: `export DOCKER_DEFAULT_PLATFORM=linux/amd64`
- Rosetta 2 설치 필요: `softwareupdate --install-rosetta`
- Docker Desktop 메모리 8GB 이상 할당 권장