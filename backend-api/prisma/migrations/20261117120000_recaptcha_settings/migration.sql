-- CreateTable
CREATE TABLE `recaptcha_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `is_enabled` BOOLEAN NOT NULL DEFAULT false,
    `version` VARCHAR(8) NOT NULL DEFAULT 'v2',
    `site_key` VARCHAR(255) NULL,
    `secret_key_enc` TEXT NULL,
    `v3_min_score` DOUBLE NOT NULL DEFAULT 0.5,
    `updated_by` BIGINT UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
