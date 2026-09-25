-- AlterTable
ALTER TABLE `vendors`
  ADD COLUMN `banner_id` BIGINT UNSIGNED NULL,
  ADD COLUMN `storefront_theme` ENUM('classic', 'marketplace', 'showcase') NOT NULL DEFAULT 'classic',
  ADD COLUMN `products_per_page` INTEGER NOT NULL DEFAULT 12,
  ADD COLUMN `featured_products_count` INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN `show_banned_brands` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `product_sort` VARCHAR(32) NOT NULL DEFAULT 'featured_first';

-- CreateIndex
CREATE UNIQUE INDEX `vendors_banner_id_key` ON `vendors`(`banner_id`);

-- AddForeignKey
ALTER TABLE `vendors` ADD CONSTRAINT `vendors_banner_id_fkey` FOREIGN KEY (`banner_id`) REFERENCES `medias`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
