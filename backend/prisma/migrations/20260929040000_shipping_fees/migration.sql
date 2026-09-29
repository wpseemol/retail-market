-- AlterTable
ALTER TABLE `site_settings`
  ADD COLUMN `shipping_default_fee` DECIMAL(12, 2) NOT NULL DEFAULT 60,
  ADD COLUMN `shipping_free_threshold` DECIMAL(12, 2) NULL,
  ADD COLUMN `shipping_vendor_override` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `products` ADD COLUMN `shipping_fee` DECIMAL(12, 2) NULL;
