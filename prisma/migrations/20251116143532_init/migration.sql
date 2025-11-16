-- CreateTable
CREATE TABLE `servers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `host` VARCHAR(255) NOT NULL,
    `port` INTEGER NOT NULL DEFAULT 22,
    `username` VARCHAR(255) NOT NULL,
    `auth_type` ENUM('password', 'key') NOT NULL,
    `password` TEXT NULL,
    `private_key` TEXT NULL,
    `description` TEXT NULL,
    `requires_client` BOOLEAN NOT NULL DEFAULT false,
    `client_type` ENUM('vpn', 'web_portal', 'custom_app', 'bastion', 'none') NULL,
    `client_config` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ssh_tunnels` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `server_id` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `local_port` INTEGER NOT NULL,
    `remote_host` VARCHAR(255) NOT NULL,
    `remote_port` INTEGER NOT NULL,
    `tunnel_type` ENUM('local', 'remote', 'dynamic') NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ssh_tunnels_server_id_idx`(`server_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `check_commands` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `command` TEXT NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `check_results` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `server_id` INTEGER NOT NULL,
    `command_id` INTEGER NOT NULL,
    `output` TEXT NULL,
    `status` ENUM('success', 'failed', 'error') NOT NULL,
    `error_message` TEXT NULL,
    `execution_time` INTEGER NOT NULL,
    `checked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `check_results_server_id_idx`(`server_id`),
    INDEX `check_results_command_id_idx`(`command_id`),
    INDEX `check_results_checked_at_idx`(`checked_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ssh_tunnels` ADD CONSTRAINT `ssh_tunnels_server_id_fkey` FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `check_results` ADD CONSTRAINT `check_results_server_id_fkey` FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `check_results` ADD CONSTRAINT `check_results_command_id_fkey` FOREIGN KEY (`command_id`) REFERENCES `check_commands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
