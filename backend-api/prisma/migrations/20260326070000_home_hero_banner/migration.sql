-- Home page hero banner content (singleton)

CREATE TABLE `home_hero_banners` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `main_eyebrow` VARCHAR(120) NOT NULL DEFAULT 'Widescreen 4k .......',
    `main_headline` VARCHAR(200) NOT NULL DEFAULT 'DIGITAL SLR CAMERA HIGH DEFINITION',
    `main_subtext` VARCHAR(300) NULL,
    `main_discount_percent` INTEGER NULL DEFAULT 70,
    `main_price_label` VARCHAR(40) NULL,
    `main_cta_label` VARCHAR(40) NOT NULL DEFAULT 'SHOP NOW',
    `main_cta_href` VARCHAR(300) NOT NULL DEFAULT '/shop',
    `main_product_image_id` BIGINT UNSIGNED NULL,
    `main_bg_image_id` BIGINT UNSIGNED NULL,
    `side_badge_label` VARCHAR(40) NULL,
    `side_offer_percent` INTEGER NULL DEFAULT 25,
    `side_offer_label` VARCHAR(40) NULL DEFAULT 'offer',
    `side_headline` VARCHAR(200) NOT NULL DEFAULT 'CLOUD CAM, SECURITY CAMERA',
    `side_discount_percent` INTEGER NULL DEFAULT 70,
    `side_cta_label` VARCHAR(40) NOT NULL DEFAULT 'SHOP NOW',
    `side_cta_href` VARCHAR(300) NOT NULL DEFAULT '/shop',
    `side_product_image_id` BIGINT UNSIGNED NULL,
    `side_bg_image_id` BIGINT UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `home_hero_banners_main_product_image_id_key`(`main_product_image_id`),
    UNIQUE INDEX `home_hero_banners_main_bg_image_id_key`(`main_bg_image_id`),
    UNIQUE INDEX `home_hero_banners_side_product_image_id_key`(`side_product_image_id`),
    UNIQUE INDEX `home_hero_banners_side_bg_image_id_key`(`side_bg_image_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `home_hero_banners`
  ADD CONSTRAINT `home_hero_banners_main_product_image_id_fkey`
    FOREIGN KEY (`main_product_image_id`) REFERENCES `medias`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `home_hero_banners_main_bg_image_id_fkey`
    FOREIGN KEY (`main_bg_image_id`) REFERENCES `medias`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `home_hero_banners_side_product_image_id_fkey`
    FOREIGN KEY (`side_product_image_id`) REFERENCES `medias`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `home_hero_banners_side_bg_image_id_fkey`
    FOREIGN KEY (`side_bg_image_id`) REFERENCES `medias`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `home_hero_banners` (
  `id`,
  `main_eyebrow`,
  `main_headline`,
  `main_subtext`,
  `main_discount_percent`,
  `main_price_label`,
  `main_cta_label`,
  `main_cta_href`,
  `side_badge_label`,
  `side_offer_percent`,
  `side_offer_label`,
  `side_headline`,
  `side_discount_percent`,
  `side_cta_label`,
  `side_cta_href`,
  `updated_at`
) VALUES (
  1,
  'Widescreen 4k .......',
  'DIGITAL SLR CAMERA HIGH DEFINITION',
  'Sumptuous, filling, and temptingly',
  70,
  '$ 180.99',
  'SHOP NOW',
  '/shop',
  'New',
  25,
  'offer',
  'CLOUD CAM, SECURITY CAMERA',
  70,
  'SHOP NOW',
  '/shop',
  CURRENT_TIMESTAMP(3)
);
