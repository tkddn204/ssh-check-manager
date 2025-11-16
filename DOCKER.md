# Docker 개발 환경 가이드

이 프로젝트는 Docker Compose를 사용하여 개발 환경을 간편하게 구성할 수 있습니다.

## 사전 요구사항

- Docker Desktop 또는 Docker Engine 설치
- Docker Compose v2.0 이상

## 빠른 시작

### 1. 환경 변수 설정

`.env.local.example` 파일을 `.env`로 복사:

```bash
cp .env.local.example .env
```

필요시 `.env` 파일의 데이터베이스 비밀번호 등을 수정하세요.

### 2. Docker Compose 실행

```bash
# 백그라운드에서 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

### 3. 데이터베이스 마이그레이션

컨테이너가 실행된 후, 로컬에서 Prisma 마이그레이션 실행:

```bash
# Prisma Client 생성
npm run prisma:generate

# 데이터베이스 스키마 푸시
npm run prisma:push
```

### 4. Next.js 개발 서버 실행

로컬에서 개발 서버 실행:

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

## 서비스 구성

### MariaDB (포트 3306)
- 데이터베이스: `ssh_check_manager`
- 사용자: `ssh_user`
- 비밀번호: `ssh_password` (`.env`에서 변경 가능)
- 루트 비밀번호: `root` (`.env`에서 변경 가능)

### Adminer (포트 8080)
- 데이터베이스 관리 웹 UI
- 접속: http://localhost:8080
- 서버: `mariadb`
- 사용자명: `ssh_user`
- 비밀번호: `ssh_password`
- 데이터베이스: `ssh_check_manager`

## Docker 명령어

### 컨테이너 시작
```bash
docker-compose up -d
```

### 컨테이너 중지
```bash
docker-compose down
```

### 컨테이너 중지 및 볼륨 삭제 (데이터 초기화)
```bash
docker-compose down -v
```

### 로그 확인
```bash
# 모든 서비스 로그
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f mariadb
```

### 컨테이너 상태 확인
```bash
docker-compose ps
```

### MariaDB 접속
```bash
docker-compose exec mariadb mysql -u ssh_user -p ssh_check_manager
# 비밀번호: ssh_password
```

### 컨테이너 재시작
```bash
docker-compose restart
```

## Prisma Studio

Prisma Studio를 사용하여 데이터베이스를 GUI로 관리할 수 있습니다:

```bash
npm run prisma:studio
```

브라우저에서 자동으로 http://localhost:5555가 열립니다.

## 트러블슈팅

### 포트 충돌

이미 3306 포트가 사용 중인 경우, `docker-compose.yml`에서 포트를 변경:

```yaml
services:
  mariadb:
    ports:
      - "3307:3306"  # 로컬 포트를 3307로 변경
```

`.env` 파일의 DATABASE_URL도 업데이트:
```env
DATABASE_URL="mysql://ssh_user:ssh_password@localhost:3307/ssh_check_manager"
```

### 데이터베이스 연결 실패

1. MariaDB 컨테이너가 실행 중인지 확인:
   ```bash
   docker-compose ps
   ```

2. 헬스체크 상태 확인:
   ```bash
   docker-compose ps mariadb
   ```

3. 컨테이너 재시작:
   ```bash
   docker-compose restart mariadb
   ```

### 데이터 초기화

모든 데이터를 삭제하고 처음부터 시작:

```bash
# 컨테이너 및 볼륨 삭제
docker-compose down -v

# 다시 시작
docker-compose up -d

# Prisma 스키마 푸시
npm run prisma:push
```

## 프로덕션 배포

프로덕션 환경에서는 별도의 `docker-compose.prod.yml` 파일을 생성하고,
환경 변수를 안전하게 관리해야 합니다.

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 볼륨 백업

데이터베이스 볼륨 백업:

```bash
# 백업
docker run --rm \
  -v ssh-check-manager_mariadb_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/mariadb-backup.tar.gz /data

# 복원
docker run --rm \
  -v ssh-check-manager_mariadb_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/mariadb-backup.tar.gz -C /
```

## 참고사항

- 개발 환경에서는 로컬에서 Next.js를 실행하고, DB만 Docker로 실행하는 것을 권장합니다.
- 전체 애플리케이션을 Docker로 실행하려면 `docker-compose.yml`에 Next.js 서비스를 추가하세요.
- `.env` 파일은 절대 버전 관리에 포함하지 마세요.
