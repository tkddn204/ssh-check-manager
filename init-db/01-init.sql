-- MariaDB 초기화 스크립트

-- 데이터베이스 문자셋 설정
ALTER DATABASE ssh_check_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 타임존 설정
SET time_zone = '+00:00';

-- Prisma Migrate를 위한 권한 부여
-- Shadow database 생성 권한
GRANT CREATE ON *.* TO 'ssh_user'@'%';
GRANT ALL PRIVILEGES ON `prisma_migrate_shadow_db_%`.* TO 'ssh_user'@'%';
FLUSH PRIVILEGES;
