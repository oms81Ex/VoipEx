# VoipEx 환경설정 및 배포 준비 가이드

이 문서는 VoipEx 프로젝트를 처음 받은 사용자가 `scripts/deploy.sh`를 문제없이 실행할 수 있도록 환경설정, 의존성 설치, 권장 사전 준비사항을 안내합니다.

---

## 1. 필수 사전 준비

- **운영체제:** macOS(M1/M2 포함), Linux (Windows는 WSL2 권장)
- **필수 소프트웨어:**
  - [Docker Desktop](https://www.docker.com/products/docker-desktop/) (최신 버전)
  - [Git](https://git-scm.com/)
  - (Mac M1/M2) Rosetta 2: `softwareupdate --install-rosetta`
- **권장 Docker 메모리:** 8GB 이상 (Kurento 등 미디어 서버 성능 위해)

---

## 2. 프로젝트 클론 및 디렉토리 이동

```bash
git clone <이 저장소 주소>
cd <프로젝트 디렉토리>
```

---

## 3. 환경 변수 파일(.env) 준비

- 프로젝트 루트에 `.env` 파일이 반드시 존재해야 합니다.
- 예시 파일이 없는 경우, 직접 아래와 같이 생성하세요:

```bash
touch .env
# (필요한 환경변수 내용을 입력)
```

- 서비스별 환경변수가 필요한 경우, 각 서비스 디렉토리(`api-gateway`, `auth-service` 등) 내에 `.env` 파일을 추가할 수 있습니다.

---

## 4. Docker Desktop 설정 (Mac M1/M2)

- Docker Desktop > Settings > Features in development >
  - "Use Rosetta for x86/amd64 emulation on Apple Silicon" 활성화
- 또는 터미널에서:
  ```bash
  export DOCKER_DEFAULT_PLATFORM=linux/amd64
  ```

---

## 5. 방화벽/포트 확인

- 다음 포트가 사용 가능해야 합니다:
  - 80, 443, 3000~3006, 8888, 27017, 6379, 9090, 3006, 40000~50000(UDP)
- 이미 사용 중인 포트가 있다면 종료하거나 포트 변경 필요

---

## 6. 권한/실행 준비

- 모든 스크립트에 실행 권한 부여:
  ```bash
  chmod +x scripts/*.sh
  ```

---

## 7. (선택) 자동 환경설정 스크립트 실행

아래 스크립트를 실행하면 위의 3, 4, 6번 과정을 자동으로 처리합니다.

```bash
bash scripts/setup-env.sh
```

---

## 8. 배포 실행

```bash
bash scripts/deploy.sh
```
- 아키텍처(AMD64/ARM64) 및 배포할 서비스(전체/특정) 선택
- 정상적으로 서비스가 기동되는지 확인

---

## 9. 문제 해결

- Docker가 실행 중인지 확인
- .env 파일이 누락되지 않았는지 확인
- 포트 충돌, 권한 문제, 메모리 부족 등은 안내 메시지에 따라 조치

---

## 문의/지원
- 추가 문의는 프로젝트 관리자에게 연락 바랍니다. 