-- AlterTable
ALTER TABLE `servers` ADD COLUMN `dbBackupLogPath` TEXT NULL,
    ADD COLUMN `dbGeneralLogPath` TEXT NULL;
