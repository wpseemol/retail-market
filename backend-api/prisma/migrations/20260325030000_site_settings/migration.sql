-- Singleton site SEO + analytics / pixels

CREATE TABLE `site_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `site_name` VARCHAR(120) NOT NULL,
    `site_title` VARCHAR(160) NOT NULL,
    `site_description` VARCHAR(500) NOT NULL,
    `keywords` VARCHAR(500) NULL,
    `og_title` VARCHAR(160) NULL,
    `og_description` VARCHAR(500) NULL,
    `og_image_id` BIGINT UNSIGNED NULL,
    `twitter_title` VARCHAR(160) NULL,
    `twitter_description` VARCHAR(500) NULL,
    `twitter_handle` VARCHAR(80) NULL,
    `google_analytics_id` VARCHAR(40) NULL,
    `google_analytics_enabled` BOOLEAN NOT NULL DEFAULT false,
    `google_tag_manager_id` VARCHAR(40) NULL,
    `google_tag_manager_enabled` BOOLEAN NOT NULL DEFAULT false,
    `hotjar_site_id` VARCHAR(40) NULL,
    `hotjar_enabled` BOOLEAN NOT NULL DEFAULT false,
    `plerdy_site_id` VARCHAR(80) NULL,
    `plerdy_enabled` BOOLEAN NOT NULL DEFAULT false,
    `google_ads_id` VARCHAR(40) NULL,
    `google_ads_enabled` BOOLEAN NOT NULL DEFAULT false,
    `tiktok_pixel_id` VARCHAR(80) NULL,
    `tiktok_enabled` BOOLEAN NOT NULL DEFAULT false,
    `linkedin_partner_id` VARCHAR(40) NULL,
    `linkedin_enabled` BOOLEAN NOT NULL DEFAULT false,
    `twitter_pixel_id` VARCHAR(80) NULL,
    `twitter_pixel_enabled` BOOLEAN NOT NULL DEFAULT false,
    `meta_pixel_id` VARCHAR(40) NULL,
    `meta_pixel_enabled` BOOLEAN NOT NULL DEFAULT false,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `site_settings_og_image_id_key`(`og_image_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `site_settings`
  ADD CONSTRAINT `site_settings_og_image_id_fkey`
    FOREIGN KEY (`og_image_id`) REFERENCES `medias`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `site_settings` (
  `id`, `site_name`, `site_title`, `site_description`, `keywords`,
  `og_title`, `og_description`, `twitter_handle`, `updated_at`
) VALUES (
  1,
  'Niyenin',
  'Niyenin | Retail Market',
  'Shop electronics, gadgets, laptops, smartphones, and more at Niyenin Retail Market. Discover daily deals, top brands, and fast delivery.',
  'Niyenin, retail market, online shop, electronics, gadgets, ecommerce',
  NULL,
  NULL,
  '@niyenin',
  CURRENT_TIMESTAMP(3)
);
