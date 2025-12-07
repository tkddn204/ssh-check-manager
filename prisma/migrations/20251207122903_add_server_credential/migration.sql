/*
  Warnings:

  - You are about to drop the column `auth_type` on the `servers` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `servers` table. All the data in the column will be lost.
  - You are about to drop the column `private_key` on the `servers` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `servers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `servers` DROP COLUMN `auth_type`,
    DROP COLUMN `password`,
    DROP COLUMN `private_key`,
    DROP COLUMN `username`,
    ADD COLUMN `credential_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `credentials` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `username` VARCHAR(255) NOT NULL,
    `auth_type` ENUM('password', 'key') NOT NULL,
    `password` TEXT NULL,
    `private_key` TEXT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `servers_credential_id_idx` ON `servers`(`credential_id`);

-- AddForeignKey
ALTER TABLE `servers` ADD CONSTRAINT `servers_credential_id_fkey` FOREIGN KEY (`credential_id`) REFERENCES `credentials`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
