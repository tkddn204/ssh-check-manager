-- AlterTable
ALTER TABLE `servers` ADD COLUMN `vpn_profile_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `vpn_profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `process_name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `servers_vpn_profile_id_idx` ON `servers`(`vpn_profile_id`);

-- AddForeignKey
ALTER TABLE `servers` ADD CONSTRAINT `servers_vpn_profile_id_fkey` FOREIGN KEY (`vpn_profile_id`) REFERENCES `vpn_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
