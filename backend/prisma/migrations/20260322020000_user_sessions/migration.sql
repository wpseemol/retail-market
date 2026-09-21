-- CreateEnum
-- DeviceType / LoginMethod embedded in table ENUMs for MySQL

CREATE TABLE `user_sessions` (
    `id` CHAR(36) NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `token_hash` VARCHAR(64) NOT NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `device_type` ENUM('desktop', 'mobile', 'tablet', 'unknown') NOT NULL DEFAULT 'unknown',
    `browser` VARCHAR(100) NULL,
    `os` VARCHAR(100) NULL,
    `login_method` ENUM('password', 'google', 'refresh') NOT NULL DEFAULT 'password',
    `is_revoked` BOOLEAN NOT NULL DEFAULT false,
    `last_activity_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_sessions_token_hash_key`(`token_hash`),
    INDEX `user_sessions_user_id_idx`(`user_id`),
    INDEX `user_sessions_last_activity_at_idx`(`last_activity_at`),
    INDEX `user_sessions_expires_at_idx`(`expires_at`),
    INDEX `user_sessions_is_revoked_idx`(`is_revoked`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `user_sessions`
  ADD CONSTRAINT `user_sessions_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
