import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'database.db');

let db: sqlite3.Database | null = null;

export function getDatabase(): sqlite3.Database {
  if (!db) {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database connection error:', err);
      } else {
        console.log('Connected to SQLite database at:', dbPath);
        initDatabase();
      }
    });
  }
  return db;
}

function initDatabase() {
  const db = getDatabase();

  db.serialize(() => {
    // 서버 정보 테이블
    db.run(`
      CREATE TABLE IF NOT EXISTS servers (
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
      )
    `);

    // 점검 명령어 테이블
    db.run(`
      CREATE TABLE IF NOT EXISTS check_commands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        command TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 점검 결과 테이블
    db.run(`
      CREATE TABLE IF NOT EXISTS check_results (
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
      )
    `);

    // 기본 점검 명령어 추가
    db.run(`
      INSERT OR IGNORE INTO check_commands (id, name, command, description)
      VALUES
        (1, 'Disk Usage', 'df -h', '디스크 사용량 확인'),
        (2, 'Memory Usage', 'free -h', '메모리 사용량 확인'),
        (3, 'CPU Load', 'uptime', 'CPU 로드 및 업타임 확인'),
        (4, 'Running Processes', 'ps aux --sort=-%cpu | head -20', '상위 CPU 사용 프로세스 확인'),
        (5, 'Network Status', 'netstat -tuln | head -20', '네트워크 리스닝 포트 확인'),
        (6, 'System Info', 'uname -a', '시스템 정보 확인'),
        (7, 'Disk I/O', 'iostat 1 5 2>/dev/null || echo "iostat not available"', '디스크 I/O 통계')
    `);

    console.log('Database tables initialized');
  });
}

// Promise wrapper for database operations
export function runQuery(sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    getDatabase().run(sql, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function getQuery<T>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    getDatabase().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
}

export function allQuery<T>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    getDatabase().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

export default getDatabase;
