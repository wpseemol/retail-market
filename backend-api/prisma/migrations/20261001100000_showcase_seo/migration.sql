-- AlterTable
ALTER TABLE `brands` ADD COLUMN `accent_color` VARCHAR(7) NULL,
    ADD COLUMN `banner_id` BIGINT UNSIGNED NULL,
    ADD COLUMN `noindex` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `og_image_id` BIGINT UNSIGNED NULL,
    ADD COLUMN `seo_description` VARCHAR(170) NULL,
    ADD COLUMN `seo_keywords` VARCHAR(255) NULL,
    ADD COLUMN `seo_title` VARCHAR(70) NULL,
    ADD COLUMN `showcase` JSON NULL,
    ADD COLUMN `tagline` VARCHAR(160) NULL,
    ADD COLUMN `vendor_id` BIGINT UNSIGNED NULL;

-- AlterTable
ALTER TABLE `medias` MODIFY `collection_name` ENUM('product_images', 'vendor_banners', 'trade_licenses', 'avatars', 'site_banners', 'review_images', 'brand_banners', 'showcase_og') NOT NULL;

-- AlterTable
ALTER TABLE `site_settings` ADD COLUMN `bing_site_verification` VARCHAR(120) NULL,
    ADD COLUMN `google_site_verification` VARCHAR(120) NULL,
    ADD COLUMN `seo_noindex_site` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `seo_pages` JSON NULL,
    ADD COLUMN `seo_title_template` VARCHAR(120) NULL;

-- AlterTable
ALTER TABLE `vendors` ADD COLUMN `accent_color` VARCHAR(7) NULL,
    ADD COLUMN `noindex` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `og_image_id` BIGINT UNSIGNED NULL,
    ADD COLUMN `seo_description` VARCHAR(170) NULL,
    ADD COLUMN `seo_keywords` VARCHAR(255) NULL,
    ADD COLUMN `seo_title` VARCHAR(70) NULL,
    ADD COLUMN `showcase` JSON NULL,
    ADD COLUMN `tagline` VARCHAR(160) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `brands_banner_id_key` ON `brands`(`banner_id`);

-- CreateIndex
CREATE UNIQUE INDEX `brands_og_image_id_key` ON `brands`(`og_image_id`);

-- CreateIndex
CREATE INDEX `brands_vendor_id_idx` ON `brands`(`vendor_id`);

-- CreateIndex
CREATE UNIQUE INDEX `vendors_og_image_id_key` ON `vendors`(`og_image_id`);

-- AddForeignKey
ALTER TABLE `brands` ADD CONSTRAINT `brands_banner_id_fkey` FOREIGN KEY (`banner_id`) REFERENCES `medias`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brands` ADD CONSTRAINT `brands_og_image_id_fkey` FOREIGN KEY (`og_image_id`) REFERENCES `medias`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brands` ADD CONSTRAINT `brands_vendor_id_fkey` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendors` ADD CONSTRAINT `vendors_og_image_id_fkey` FOREIGN KEY (`og_image_id`) REFERENCES `medias`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
