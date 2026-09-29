-- CreateTable
CREATE TABLE `social_login_providers` (
    `provider` VARCHAR(20) NOT NULL,
    `is_enabled` BOOLEAN NOT NULL DEFAULT false,
    `client_id` VARCHAR(255) NULL,
    `client_secret_enc` TEXT NULL,
    `team_id` VARCHAR(20) NULL,
    `key_id` VARCHAR(20) NULL,
    `private_key_enc` TEXT NULL,
    `updated_by` BIGINT UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`provider`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `user_sessions` MODIFY `login_method` ENUM('password', 'google', 'facebook', 'apple', 'refresh') NOT NULL DEFAULT 'password';
