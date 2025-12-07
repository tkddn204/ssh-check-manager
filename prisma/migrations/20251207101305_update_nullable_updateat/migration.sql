-- AlterTable
ALTER TABLE `servers` MODIFY `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `ssh_tunnels` MODIFY `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `vpn_profiles` MODIFY `updated_at` DATETIME(3) NULL;
