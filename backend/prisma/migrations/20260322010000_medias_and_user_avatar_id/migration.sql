-- Polymorphic media library
CREATE TABLE `medias` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NULL,
    `disk` ENUM('local', 's3', 'r2', 'public') NOT NULL DEFAULT 'public',
    `file_name` VARCHAR(255) NOT NULL,
    `original_name` VARCHAR(255) NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `file_size` BIGINT UNSIGNED NULL,
    `mime_type` VARCHAR(100) NULL,
    `dimensions` JSON NULL,
    `alt_text` VARCHAR(255) NULL,
    `collection_name` ENUM('product_images', 'vendor_banners', 'trade_licenses', 'avatars', 'site_banners') NOT NULL,
    `is_public` BOOLEAN NOT NULL DEFAULT true,
    `mediable_type` VARCHAR(100) NULL,
    `mediable_id` BIGINT UNSIGNED NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `medias_user_id_idx`(`user_id`),
    INDEX `medias_collection_name_idx`(`collection_name`),
    INDEX `medias_mediable_type_mediable_id_idx`(`mediable_type`, `mediable_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Users: primary avatar FK
ALTER TABLE `users` ADD COLUMN `avatar_id` BIGINT UNSIGNED NULL;

-- Migrate legacy user_avatars → medias
INSERT INTO `medias` (
    `user_id`,
    `disk`,
    `file_name`,
    `original_name`,
    `file_path`,
    `collection_name`,
    `is_public`,
    `mediable_type`,
    `mediable_id`,
    `sort_order`,
    `created_at`,
    `updated_at`
)
SELECT
    ua.`user_id`,
    'public',
    SUBSTRING_INDEX(ua.`path`, '/', -1),
    SUBSTRING_INDEX(ua.`path`, '/', -1),
    CASE
        WHEN LOCATE('/', ua.`path`) > 0 THEN
            LEFT(ua.`path`, CHAR_LENGTH(ua.`path`) - CHAR_LENGTH(SUBSTRING_INDEX(ua.`path`, '/', -1)))
        ELSE
            'uploads/avatars/'
    END,
    'avatars',
    true,
    'User',
    ua.`user_id`,
    0,
    ua.`created_at`,
    ua.`updated_at`
FROM `user_avatars` ua;

UPDATE `users` u
INNER JOIN `medias` m
  ON m.`mediable_type` = 'User'
 AND m.`mediable_id` = u.`id`
 AND m.`collection_name` = 'avatars'
SET u.`avatar_id` = m.`id`;

CREATE UNIQUE INDEX `users_avatar_id_key` ON `users`(`avatar_id`);

ALTER TABLE `medias`
  ADD CONSTRAINT `medias_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `users`
  ADD CONSTRAINT `users_avatar_id_fkey`
  FOREIGN KEY (`avatar_id`) REFERENCES `medias`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `user_avatars` DROP FOREIGN KEY `user_avatars_user_id_fkey`;
DROP TABLE `user_avatars`;
