-- Expand catalog: product media, options, variants

-- Categories: image + SEO
ALTER TABLE `categories`
  ADD COLUMN `image_id` BIGINT UNSIGNED NULL AFTER `parent_id`,
  ADD COLUMN `meta_title` VARCHAR(160) NULL AFTER `description`,
  ADD COLUMN `meta_description` VARCHAR(320) NULL AFTER `meta_title`,
  ADD INDEX `categories_sort_order_idx`(`sort_order`),
  ADD UNIQUE INDEX `categories_image_id_key`(`image_id`);

ALTER TABLE `categories`
  ADD CONSTRAINT `categories_image_id_fkey`
    FOREIGN KEY (`image_id`) REFERENCES `medias`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Products: thumbnail, commerce fields, type
ALTER TABLE `products`
  ADD COLUMN `thumbnail_id` BIGINT UNSIGNED NULL AFTER `category_id`,
  ADD COLUMN `barcode` VARCHAR(64) NULL AFTER `sku`,
  ADD COLUMN `brand` VARCHAR(120) NULL AFTER `barcode`,
  ADD COLUMN `type` ENUM('simple', 'variable') NOT NULL DEFAULT 'simple' AFTER `short_description`,
  ADD COLUMN `cost_price` DECIMAL(12, 2) NULL AFTER `compare_at_price`,
  ADD COLUMN `low_stock_threshold` INTEGER UNSIGNED NULL AFTER `stock_qty`,
  ADD COLUMN `weight` DECIMAL(10, 3) NULL AFTER `low_stock_threshold`,
  ADD COLUMN `weight_unit` ENUM('g', 'kg', 'lb', 'oz') NOT NULL DEFAULT 'kg' AFTER `weight`,
  ADD COLUMN `is_taxable` BOOLEAN NOT NULL DEFAULT true AFTER `is_featured`,
  ADD COLUMN `meta_title` VARCHAR(160) NULL AFTER `is_taxable`,
  ADD COLUMN `meta_description` VARCHAR(320) NULL AFTER `meta_title`,
  ADD COLUMN `published_at` DATETIME(3) NULL AFTER `meta_description`,
  ADD UNIQUE INDEX `products_thumbnail_id_key`(`thumbnail_id`),
  ADD INDEX `products_type_idx`(`type`),
  ADD INDEX `products_is_featured_idx`(`is_featured`),
  ADD INDEX `products_published_at_idx`(`published_at`);

ALTER TABLE `products`
  ADD CONSTRAINT `products_thumbnail_id_fkey`
    FOREIGN KEY (`thumbnail_id`) REFERENCES `medias`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `product_options` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `product_options_product_id_name_key`(`product_id`, `name`),
    INDEX `product_options_product_id_position_idx`(`product_id`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `product_option_values` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `option_id` BIGINT UNSIGNED NOT NULL,
    `value` VARCHAR(120) NOT NULL,
    `color_hex` VARCHAR(7) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `product_option_values_option_id_value_key`(`option_id`, `value`),
    INDEX `product_option_values_option_id_position_idx`(`option_id`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `product_variants` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `image_id` BIGINT UNSIGNED NULL,
    `sku` VARCHAR(100) NULL,
    `barcode` VARCHAR(64) NULL,
    `title` VARCHAR(255) NULL,
    `price` DECIMAL(12, 2) NULL,
    `compare_at_price` DECIMAL(12, 2) NULL,
    `cost_price` DECIMAL(12, 2) NULL,
    `stock_qty` INTEGER NOT NULL DEFAULT 0,
    `weight` DECIMAL(10, 3) NULL,
    `weight_unit` ENUM('g', 'kg', 'lb', 'oz') NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `position` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `product_variants_image_id_key`(`image_id`),
    UNIQUE INDEX `product_variants_sku_key`(`sku`),
    INDEX `product_variants_product_id_idx`(`product_id`),
    INDEX `product_variants_product_id_is_default_idx`(`product_id`, `is_default`),
    INDEX `product_variants_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `product_variant_options` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `variant_id` BIGINT UNSIGNED NOT NULL,
    `option_value_id` BIGINT UNSIGNED NOT NULL,

    UNIQUE INDEX `product_variant_options_variant_id_option_value_id_key`(`variant_id`, `option_value_id`),
    INDEX `product_variant_options_option_value_id_idx`(`option_value_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Cart / order line items: bind to variants
ALTER TABLE `cart_items`
  ADD COLUMN `product_variant_id` BIGINT UNSIGNED NULL AFTER `product_id`,
  DROP INDEX `cart_items_cart_id_product_id_key`,
  ADD UNIQUE INDEX `cart_items_cart_id_product_id_product_variant_id_key`(`cart_id`, `product_id`, `product_variant_id`),
  ADD INDEX `cart_items_product_variant_id_idx`(`product_variant_id`);

ALTER TABLE `order_items`
  ADD COLUMN `product_variant_id` BIGINT UNSIGNED NULL AFTER `product_id`,
  ADD COLUMN `variant_title` VARCHAR(255) NULL AFTER `product_sku`,
  ADD INDEX `order_items_product_variant_id_idx`(`product_variant_id`);

-- Foreign keys
ALTER TABLE `product_options`
  ADD CONSTRAINT `product_options_product_id_fkey`
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `product_option_values`
  ADD CONSTRAINT `product_option_values_option_id_fkey`
    FOREIGN KEY (`option_id`) REFERENCES `product_options`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `product_variants`
  ADD CONSTRAINT `product_variants_product_id_fkey`
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `product_variants_image_id_fkey`
    FOREIGN KEY (`image_id`) REFERENCES `medias`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `product_variant_options`
  ADD CONSTRAINT `product_variant_options_variant_id_fkey`
    FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `product_variant_options_option_value_id_fkey`
    FOREIGN KEY (`option_value_id`) REFERENCES `product_option_values`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `cart_items`
  ADD CONSTRAINT `cart_items_product_variant_id_fkey`
    FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_product_variant_id_fkey`
    FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
