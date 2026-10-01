-- Storefront chrome (header/footer) + nav menus + home sections

ALTER TABLE `site_settings`
  ADD COLUMN `topbar_email` VARCHAR(160) NULL,
  ADD COLUMN `topbar_phone` VARCHAR(40) NULL,
  ADD COLUMN `footer_blurb` VARCHAR(500) NULL,
  ADD COLUMN `footer_phone` VARCHAR(40) NULL,
  ADD COLUMN `footer_callout` VARCHAR(120) NULL,
  ADD COLUMN `social_facebook` VARCHAR(300) NULL,
  ADD COLUMN `social_twitter` VARCHAR(300) NULL,
  ADD COLUMN `social_youtube` VARCHAR(300) NULL,
  ADD COLUMN `social_linkedin` VARCHAR(300) NULL,
  ADD COLUMN `social_instagram` VARCHAR(300) NULL;

CREATE TABLE `site_nav_items` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `settings_id` INTEGER NOT NULL DEFAULT 1,
    `menu` VARCHAR(32) NOT NULL,
    `label` VARCHAR(120) NOT NULL,
    `href` VARCHAR(500) NOT NULL,
    `external` BOOLEAN NOT NULL DEFAULT false,
    `position` INTEGER NOT NULL DEFAULT 0,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `parent_id` BIGINT UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `site_nav_items_settings_id_menu_position_idx`(`settings_id`, `menu`, `position`),
    INDEX `site_nav_items_parent_id_idx`(`parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `site_nav_items`
  ADD CONSTRAINT `site_nav_items_settings_id_fkey`
    FOREIGN KEY (`settings_id`) REFERENCES `site_settings`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `site_nav_items_parent_id_fkey`
    FOREIGN KEY (`parent_id`) REFERENCES `site_nav_items`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `home_sections` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `settings_id` INTEGER NOT NULL DEFAULT 1,
    `key` VARCHAR(64) NOT NULL,
    `label` VARCHAR(120) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `home_sections_settings_id_key_key`(`settings_id`, `key`),
    INDEX `home_sections_settings_id_position_idx`(`settings_id`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `home_sections`
  ADD CONSTRAINT `home_sections_settings_id_fkey`
    FOREIGN KEY (`settings_id`) REFERENCES `site_settings`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE `site_settings` SET
  `topbar_email` = 'retailmarket@gmail.com',
  `topbar_phone` = '+1(213)628-3034',
  `footer_blurb` = 'Phasellus justo ligula, dictum sit amet tortor eu, iaculis tristique turpis. Mauris non orci sed est suscipit tempor ut quis felis.',
  `footer_phone` = '+1(000)000-000',
  `footer_callout` = 'Got Question? Call Us 24/7!',
  `social_facebook` = 'https://facebook.com',
  `social_twitter` = 'https://x.com',
  `social_youtube` = 'https://youtube.com',
  `social_linkedin` = 'https://linkedin.com',
  `social_instagram` = 'https://instagram.com'
WHERE `id` = 1;
