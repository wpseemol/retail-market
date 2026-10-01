-- Shared product brands (create first, then assign on products).
CREATE TABLE `brands` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `slug` VARCHAR(140) NOT NULL,
    `description` VARCHAR(500) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `brands_slug_key`(`slug`),
    INDEX `brands_is_active_idx`(`is_active`),
    INDEX `brands_sort_order_idx`(`sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `products`
  ADD COLUMN `brand_id` BIGINT UNSIGNED NULL,
  ADD INDEX `products_brand_id_idx`(`brand_id`);

ALTER TABLE `products`
  ADD CONSTRAINT `products_brand_id_fkey`
    FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Default brands so products can pick Unknown / Handmade immediately.
INSERT INTO `brands` (`name`, `slug`, `description`, `is_active`, `sort_order`, `updated_at`)
VALUES
  ('Unknown', 'unknown', 'No brand / unspecified', true, 0, CURRENT_TIMESTAMP(3)),
  ('Handmade', 'handmade', 'Handmade products', true, 1, CURRENT_TIMESTAMP(3));
