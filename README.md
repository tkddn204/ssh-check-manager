# SSH Check Manager

SSH를 통해 원격 서버에 접속하여 점검 명령어를 실행하고, 점검 결과를 일별/월별로 확인할 수 있는 웹 기반 서버 헬스 체크 관리 시스템입니다.

## 주요 기능

### 1. 서버 관리
- SSH로 접속할 서버 등록 및 관리
- 비밀번호 또는 SSH 키 기반 인증 지원
- 서버 정보 수정 및 삭제

### 2. 점검 실행
- 여러 서버에 대해 여러 점검 명령어 일괄 실행
- 실시간 점검 결과 확인
- 점검 결과 이력 저장 및 조회

### 3. 리포트 및 통계
- 일별/월별 점검 통계 차트
- 성공률, 실패율, 평균 실행 시간 분석
- 상세 데이터 테이블 뷰

### 4. 대시보드
- 전체 시스템 현황 한눈에 확인
- 등록된 서버 수, 총 점검 수, 성공률 등 주요 지표
- 최근 점검 결과 미리보기

## 기술 스택

- **Frontend & Backend**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: SQLite3
- **SSH Client**: ssh2
- **Charts**: Recharts
- **Styling**: Tailwind CSS

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example` 파일을 복사하여 `.env` 파일을 생성합니다:

```bash
cp .env.example .env
```

`.env` 파일 내용:
```
DB_PATH=./database.db
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 애플리케이션에 접속합니다.

### 4. 프로덕션 빌드

```bash
npm run build
npm start
```

## 사용 방법

### 서버 추가

1. 상단 네비게이션에서 "서버 관리" 클릭
2. "서버 추가" 버튼 클릭
3. 서버 정보 입력:
   - 서버 이름
   - 호스트 (IP 주소 또는 도메인)
   - 포트 (기본값: 22)
   - 사용자 이름
   - 인증 방식 선택 (비밀번호 또는 SSH 키)
   - 비밀번호 또는 SSH 개인 키 입력
4. "추가" 버튼 클릭

### 점검 실행

1. 상단 네비게이션에서 "점검 실행" 클릭
2. 점검할 서버 선택 (다중 선택 가능)
3. 실행할 점검 명령어 선택 (다중 선택 가능)
4. "점검 실행" 버튼 클릭
5. 점검 완료 후 결과 확인

### 리포트 확인

1. 상단 네비게이션에서 "리포트" 클릭
2. 일별/월별 보기 선택
3. 기간 선택 (7일, 30일, 90일 또는 6개월, 12개월, 24개월)
4. 차트와 테이블로 통계 확인

## 기본 제공 점검 명령어

시스템은 다음 점검 명령어를 기본으로 제공합니다:

1. **Disk Usage**: 디스크 사용량 확인 (`df -h`)
2. **Memory Usage**: 메모리 사용량 확인 (`free -h`)
3. **CPU Load**: CPU 로드 및 업타임 확인 (`uptime`)
4. **Running Processes**: 상위 CPU 사용 프로세스 확인 (`ps aux --sort=-%cpu | head -20`)
5. **Network Status**: 네트워크 리스닝 포트 확인 (`netstat -tuln | head -20`)
6. **System Info**: 시스템 정보 확인 (`uname -a`)
7. **Disk I/O**: 디스크 I/O 통계 (`iostat 1 5`)

## 데이터베이스 스키마

### servers 테이블
서버 정보를 저장합니다.

```sql
CREATE TABLE servers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER DEFAULT 22,
  username TEXT NOT NULL,
  auth_type TEXT NOT NULL CHECK(auth_type IN ('password', 'key')),
  password TEXT,
  private_key TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### check_commands 테이블
점검 명령어를 저장합니다.

```sql
CREATE TABLE check_commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  command TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### check_results 테이블
점검 결과를 저장합니다.

```sql
CREATE TABLE check_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER NOT NULL,
  command_id INTEGER NOT NULL,
  output TEXT,
  status TEXT CHECK(status IN ('success', 'failed', 'error')),
  error_message TEXT,
  execution_time INTEGER,
  checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (server_id) REFERENCES servers (id) ON DELETE CASCADE,
  FOREIGN KEY (command_id) REFERENCES check_commands (id) ON DELETE CASCADE
);
```

## API 엔드포인트

### 서버 관리
- `GET /api/servers` - 모든 서버 조회
- `POST /api/servers` - 새 서버 추가
- `GET /api/servers/:id` - 특정 서버 조회
- `PUT /api/servers/:id` - 서버 정보 수정
- `DELETE /api/servers/:id` - 서버 삭제

### 명령어 관리
- `GET /api/commands` - 모든 점검 명령어 조회
- `POST /api/commands` - 새 점검 명령어 추가

### 점검 실행
- `POST /api/checks/execute` - 단일 점검 실행
- `POST /api/checks/batch` - 일괄 점검 실행

### 점검 결과
- `GET /api/checks/results` - 점검 결과 조회 (필터링 지원)

### 리포트
- `GET /api/reports/daily` - 일별 리포트
- `GET /api/reports/monthly` - 월별 리포트
- `GET /api/reports/summary` - 전체 통계 요약

## 보안 고려사항

1. **SSH 연결**: 모든 SSH 연결은 서버 사이드에서 처리됩니다
2. **인증 정보**: 비밀번호와 SSH 키는 데이터베이스에 저장되며, API 응답에서는 제외됩니다
3. **프로덕션 환경**:
   - 데이터베이스 파일을 안전한 위치에 저장하세요
   - HTTPS를 사용하세요
   - 적절한 인증/인가 시스템을 추가하세요 (현재는 미구현)
   - 환경 변수로 민감한 정보를 관리하세요

## 개발

### 프로젝트 구조

```
ssh-check-manager/
├── app/                      # Next.js App Router 페이지
│   ├── api/                 # API 라우트
│   │   ├── servers/        # 서버 관리 API
│   │   ├── commands/       # 명령어 관리 API
│   │   ├── checks/         # 점검 실행 API
│   │   └── reports/        # 리포트 API
│   ├── servers/            # 서버 관리 페이지
│   ├── checks/             # 점검 실행 페이지
│   ├── reports/            # 리포트 페이지
│   ├── layout.tsx          # 루트 레이아웃
│   ├── page.tsx            # 대시보드 페이지
│   └── globals.css         # 글로벌 스타일
├── lib/                     # 유틸리티 및 라이브러리
│   ├── db.ts               # 데이터베이스 연결 및 헬퍼
│   ├── ssh.ts              # SSH 연결 유틸리티
│   └── types.ts            # TypeScript 타입 정의
├── public/                  # 정적 파일
├── .env.example            # 환경 변수 예제
├── next.config.js          # Next.js 설정
├── tailwind.config.js      # Tailwind CSS 설정
├── tsconfig.json           # TypeScript 설정
└── package.json            # 프로젝트 의존성
```

## 라이선스

MIT License

## 기여

이슈와 풀 리퀘스트는 언제나 환영합니다!

## 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해주세요.
