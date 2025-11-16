# SSH Check Manager

SSH 서버 상태 점검 및 터널링 관리 시스템입니다. Next.js와 Prisma, MariaDB를 사용하여 구축되었습니다.

## 주요 기능

### 1. SSH 터널링 관리
- **Local Port Forwarding (-L)**: 로컬 포트를 원격 서버로 포워딩
- **Remote Port Forwarding (-R)**: 원격 포트를 로컬로 포워딩
- **Dynamic Port Forwarding (-D)**: SOCKS 프록시 생성

### 2. 서버 관리
- SSH 서버 등록 및 관리
- 패스워드 또는 키 기반 인증 지원
- **VPN/특별 프로그램 요구사항 설정**
  - VPN 클라이언트 설정
  - 웹 포털 접속 정보
  - 커스텀 애플리케이션 경로
  - Bastion 호스트 설정

### 3. 서버 접속 점검
- 자동 서버 상태 점검
- 커스텀 명령어 실행
- 점검 결과 기록 및 통계

### 4. 대시보드
- **서버별 월간 접속 현황 캘린더 뷰**
- 일별 접속 성공/실패 상태 표시
- 월별 네비게이션

### 5. 리포트
- 일별/월별 통계
- 성공률 및 평균 실행 시간 분석

## 기술 스택

- **Frontend**: Next.js 14, React 18, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: MariaDB + Prisma ORM
- **SSH**: ssh2 (Node.js SSH2 client)
- **Date Utilities**: date-fns
- **Charts**: Recharts

## 설치 및 실행

### 옵션 A: Docker 사용 (권장)

Docker를 사용하면 MariaDB를 손쉽게 실행할 수 있습니다.

#### 1. Docker Compose 실행

```bash
# 환경 변수 파일 생성
cp .env.local.example .env

# Docker Compose 실행
docker-compose up -d
```

#### 2. 의존성 설치

```bash
npm install
# 또는
pnpm install
```

#### 3. 데이터베이스 설정

```bash
npm run prisma:generate
npm run prisma:push
```

#### 4. 개발 서버 실행

```bash
npm run dev
```

**서비스 접속:**
- Next.js 앱: http://localhost:3000
- Adminer (DB 관리): http://localhost:8080

자세한 내용은 [DOCKER.md](./DOCKER.md)를 참조하세요.

---

### 옵션 B: 로컬 MariaDB 사용

#### 1. 의존성 설치

```bash
npm install
# 또는
pnpm install
```

#### 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 추가합니다:

```env
# MariaDB Database Connection
DATABASE_URL="mysql://user:password@localhost:3306/ssh_check_manager"

# 개발 환경 예시
# DATABASE_URL="mysql://root:root@localhost:3306/ssh_check_manager"
```

### 3. 데이터베이스 설정

```bash
# Prisma Client 생성
npm run prisma:generate

# 데이터베이스 스키마 푸시 (개발 환경)
npm run prisma:push

# 또는 마이그레이션 생성 (프로덕션)
npm run prisma:migrate
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인합니다.

### 5. Prisma Studio (선택사항)

```bash
npm run prisma:studio
```

## 클라이언트 요구사항 설정

서버에 접속하기 전에 특별한 프로그램이나 VPN 연결이 필요한 경우 다음과 같이 설정할 수 있습니다:

### VPN 설정 예시
```json
{
  "vpnName": "Company VPN",
  "vpnExecutablePath": "C:\\Program Files\\OpenVPN\\bin\\openvpn-gui.exe",
  "vpnConfigPath": "C:\\Users\\user\\company.ovpn"
}
```

### 웹 포털 설정 예시
```json
{
  "webPortalUrl": "https://portal.company.com",
  "webPortalInstructions": "로그인 후 'SSH 접속' 메뉴에서 세션을 활성화하세요"
}
```

### Bastion 호스트 설정 예시
```json
{
  "bastionHost": "bastion.company.com",
  "bastionPort": 22,
  "bastionUsername": "jumpuser",
  "bastionAuthType": "key",
  "bastionPrivateKey": "-----BEGIN RSA PRIVATE KEY-----\n..."
}
```

## SSH 터널링 사용 예시

### Local Port Forwarding
로컬의 8080 포트를 원격 서버의 localhost:80으로 포워딩:
- Local Port: 8080
- Remote Host: localhost
- Remote Port: 80
- Tunnel Type: local

### Remote Port Forwarding
원격 서버의 9000 포트를 로컬의 localhost:3000으로 포워딩:
- Local Port: 3000
- Remote Host: (원격 서버 주소)
- Remote Port: 9000
- Tunnel Type: remote

### Dynamic Port Forwarding (SOCKS Proxy)
로컬의 1080 포트에 SOCKS 프록시 생성:
- Local Port: 1080
- Tunnel Type: dynamic

## 기본 제공 점검 명령어

시스템은 다음 점검 명령어를 기본으로 제공합니다:

1. **Disk Usage**: 디스크 사용량 확인 (`df -h`)
2. **Memory Usage**: 메모리 사용량 확인 (`free -h`)
3. **CPU Load**: CPU 로드 및 업타임 확인 (`uptime`)
4. **Running Processes**: 상위 CPU 사용 프로세스 확인 (`ps aux --sort=-%cpu | head -20`)
5. **Network Status**: 네트워크 리스닝 포트 확인 (`netstat -tuln | head -20`)
6. **System Info**: 시스템 정보 확인 (`uname -a`)
7. **Disk I/O**: 디스크 I/O 통계 (`iostat 1 5`)

## 데이터베이스 스키마 (Prisma)

### Server (서버)
- 서버 접속 정보 (host, port, username)
- 인증 방식 (password/key)
- 클라이언트 요구사항 (VPN, 웹 포털, 커스텀 앱 등)

### SSHTunnel (SSH 터널)
- 터널 타입 (local/remote/dynamic)
- 포트 포워딩 설정
- 활성화 상태

### CheckCommand (점검 명령어)
- 실행할 SSH 명령어
- 명령어 설명

### CheckResult (점검 결과)
- 서버별 점검 기록
- 성공/실패 상태
- 실행 시간 및 출력

자세한 스키마는 `prisma/schema.prisma` 파일을 참조하세요.

## API 엔드포인트

### 서버 관리
- `GET /api/servers` - 서버 목록 조회
- `POST /api/servers` - 서버 등록
- `GET /api/servers/[id]` - 서버 상세 조회
- `PUT /api/servers/[id]` - 서버 정보 수정
- `DELETE /api/servers/[id]` - 서버 삭제

### 점검 실행
- `POST /api/checks/execute` - 점검 실행
- `POST /api/checks/batch` - 일괄 점검
- `GET /api/checks/results` - 점검 결과 조회

### 대시보드
- `GET /api/dashboard/monthly-status` - 서버별 월간 접속 현황

### 리포트
- `GET /api/reports/summary` - 전체 통계
- `GET /api/reports/daily` - 일별 리포트
- `GET /api/reports/monthly` - 월별 리포트

## 보안 주의사항

1. **환경 변수**: `.env` 파일은 절대 버전 관리에 포함하지 마세요
2. **SSH 키**: Private Key는 암호화하여 저장하는 것을 권장합니다
3. **비밀번호**: 프로덕션 환경에서는 비밀번호 대신 SSH 키 사용을 권장합니다
4. **데이터베이스**: 프로덕션 환경에서는 강력한 비밀번호와 방화벽 설정 필수

## 프로젝트 구조

```
ssh-check-manager/
├── app/                      # Next.js App Router
│   ├── api/                 # API Routes
│   │   ├── servers/        # 서버 관리 API
│   │   ├── checks/         # 점검 API
│   │   ├── dashboard/      # 대시보드 API
│   │   └── reports/        # 리포트 API
│   ├── servers/            # 서버 관리 페이지
│   ├── checks/             # 점검 페이지
│   ├── reports/            # 리포트 페이지
│   ├── layout.tsx          # 레이아웃
│   ├── page.tsx            # 대시보드 (홈)
│   └── globals.css         # 전역 스타일
├── lib/                     # 유틸리티 라이브러리
│   ├── db.ts               # Prisma Client
│   ├── ssh.ts              # SSH 및 터널링 기능
│   └── types.ts            # TypeScript 타입 정의
├── prisma/                  # Prisma 설정
│   └── schema.prisma       # 데이터베이스 스키마
├── package.json
├── tsconfig.json
└── README.md
```

## 라이선스

MIT License
