-- Session country + anonymous page visits for overview analytics

ALTER TABLE `user_sessions`
  ADD COLUMN `country` VARCHAR(2) NULL AFTER `ip_address`,
  ADD INDEX `user_sessions_country_idx`(`country`);

CREATE TABLE `page_visits` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `country` VARCHAR(2) NOT NULL,
    `path` VARCHAR(255) NOT NULL,
    `referrer` VARCHAR(500) NULL,
    `ip_hash` VARCHAR(64) NULL,
    `device_type` ENUM('desktop', 'mobile', 'tablet', 'unknown') NOT NULL DEFAULT 'unknown',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `page_visits_created_at_idx`(`created_at`),
    INDEX `page_visits_country_created_at_idx`(`country`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
