-- AlterTable
ALTER TABLE `servers` ADD COLUMN `execution_location` ENUM('server', 'client') NOT NULL DEFAULT 'client';
