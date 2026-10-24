SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

-- Import this once in phpMyAdmin on an empty database.
-- Dashboard login after import: superadmin@niyenin.local / SuperAdmin123!
-- Change that password after the first login.


-- 20260321050000_create_users_and_avatars
-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(30) NULL,
    `password` VARCHAR(255) NULL,
    `role` ENUM('super_admin', 'admin', 'moderator', 'vendor', 'customer') NOT NULL DEFAULT 'customer',
    `status` ENUM('active', 'inactive', 'pending', 'suspended', 'banned') NOT NULL DEFAULT 'active',
    `gender` ENUM('male', 'female', 'other') NULL,
    `date_of_birth` DATE NULL,
    `email_verified_at` DATETIME(3) NULL,
    `phone_verified_at` DATETIME(3) NULL,
    `two_factor_secret` TEXT NULL,
    `two_factor_recovery_codes` TEXT NULL,
    `two_factor_confirmed_at` DATETIME(3) NULL,
    `remember_token` VARCHAR(100) NULL,
    `provider_name` VARCHAR(50) NULL,
    `provider_id` VARCHAR(255) NULL,
    `last_login_at` DATETIME(3) NULL,
    `last_login_ip` VARCHAR(45) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_avatars` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `path` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_avatars_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_avatars` ADD CONSTRAINT `user_avatars_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 20260322010000_medias_and_user_avatar_id
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

-- 20260322020000_user_sessions
-- CreateEnum
-- DeviceType / LoginMethod embedded in table ENUMs for MySQL

CREATE TABLE `user_sessions` (
    `id` CHAR(36) NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `token_hash` VARCHAR(64) NOT NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `device_type` ENUM('desktop', 'mobile', 'tablet', 'unknown') NOT NULL DEFAULT 'unknown',
    `browser` VARCHAR(100) NULL,
    `os` VARCHAR(100) NULL,
    `login_method` ENUM('password', 'google', 'refresh') NOT NULL DEFAULT 'password',
    `is_revoked` BOOLEAN NOT NULL DEFAULT false,
    `last_activity_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_sessions_token_hash_key`(`token_hash`),
    INDEX `user_sessions_user_id_idx`(`user_id`),
    INDEX `user_sessions_last_activity_at_idx`(`last_activity_at`),
    INDEX `user_sessions_expires_at_idx`(`expires_at`),
    INDEX `user_sessions_is_revoked_idx`(`is_revoked`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `user_sessions`
  ADD CONSTRAINT `user_sessions_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 20260323010000_customer_ecommerce_tables
-- Customer ecommerce + catalog foundation

-- Enums are MySQL ENUM columns on tables

CREATE TABLE `categories` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `parent_id` BIGINT UNSIGNED NULL,
    `name` VARCHAR(150) NOT NULL,
    `slug` VARCHAR(160) NOT NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `categories_slug_key`(`slug`),
    INDEX `categories_parent_id_idx`(`parent_id`),
    INDEX `categories_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `vendors` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `shop_name` VARCHAR(200) NOT NULL,
    `slug` VARCHAR(220) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('active', 'inactive', 'pending', 'suspended', 'banned') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `vendors_user_id_key`(`user_id`),
    UNIQUE INDEX `vendors_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `products` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `vendor_id` BIGINT UNSIGNED NULL,
    `category_id` BIGINT UNSIGNED NULL,
    `name` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(270) NOT NULL,
    `sku` VARCHAR(100) NULL,
    `description` TEXT NULL,
    `short_description` VARCHAR(500) NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `compare_at_price` DECIMAL(12, 2) NULL,
    `stock_qty` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('draft', 'active', 'archived', 'out_of_stock') NOT NULL DEFAULT 'draft',
    `is_featured` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `products_slug_key`(`slug`),
    UNIQUE INDEX `products_sku_key`(`sku`),
    INDEX `products_vendor_id_idx`(`vendor_id`),
    INDEX `products_category_id_idx`(`category_id`),
    INDEX `products_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `customer_addresses` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `label` VARCHAR(50) NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `line1` VARCHAR(255) NOT NULL,
    `line2` VARCHAR(255) NULL,
    `city` VARCHAR(100) NOT NULL,
    `state` VARCHAR(100) NULL,
    `postal_code` VARCHAR(20) NOT NULL,
    `country` VARCHAR(2) NOT NULL DEFAULT 'BD',
    `type` ENUM('shipping', 'billing', 'both') NOT NULL DEFAULT 'both',
    `is_default_shipping` BOOLEAN NOT NULL DEFAULT false,
    `is_default_billing` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `customer_addresses_user_id_idx`(`user_id`),
    INDEX `customer_addresses_user_id_is_default_shipping_idx`(`user_id`, `is_default_shipping`),
    INDEX `customer_addresses_user_id_is_default_billing_idx`(`user_id`, `is_default_billing`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `carts` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `carts_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `cart_items` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `cart_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `cart_items_product_id_idx`(`product_id`),
    UNIQUE INDEX `cart_items_cart_id_product_id_key`(`cart_id`, `product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `wishlists` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `wishlists_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `wishlist_items` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `wishlist_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `wishlist_items_product_id_idx`(`product_id`),
    UNIQUE INDEX `wishlist_items_wishlist_id_product_id_key`(`wishlist_id`, `product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `orders` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `order_number` VARCHAR(40) NOT NULL,
    `status` ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending',
    `payment_status` ENUM('pending', 'paid', 'failed', 'refunded', 'partially_refunded') NOT NULL DEFAULT 'pending',
    `payment_method` ENUM('cash_on_delivery', 'card', 'mobile_banking', 'bank_transfer', 'wallet') NOT NULL DEFAULT 'cash_on_delivery',
    `currency` VARCHAR(3) NOT NULL DEFAULT 'BDT',
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `shipping_fee` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discount_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `tax_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(12, 2) NOT NULL,
    `notes` TEXT NULL,
    `placed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cancelled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `orders_order_number_key`(`order_number`),
    INDEX `orders_user_id_idx`(`user_id`),
    INDEX `orders_status_idx`(`status`),
    INDEX `orders_payment_status_idx`(`payment_status`),
    INDEX `orders_placed_at_idx`(`placed_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `order_items` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NULL,
    `product_name` VARCHAR(255) NOT NULL,
    `product_sku` VARCHAR(100) NULL,
    `unit_price` DECIMAL(12, 2) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `line_total` DECIMAL(12, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `order_items_order_id_idx`(`order_id`),
    INDEX `order_items_product_id_idx`(`product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `order_addresses` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT UNSIGNED NOT NULL,
    `type` ENUM('shipping', 'billing') NOT NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `line1` VARCHAR(255) NOT NULL,
    `line2` VARCHAR(255) NULL,
    `city` VARCHAR(100) NOT NULL,
    `state` VARCHAR(100) NULL,
    `postal_code` VARCHAR(20) NOT NULL,
    `country` VARCHAR(2) NOT NULL DEFAULT 'BD',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `order_addresses_order_id_type_key`(`order_id`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payments` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT UNSIGNED NOT NULL,
    `method` ENUM('cash_on_delivery', 'card', 'mobile_banking', 'bank_transfer', 'wallet') NOT NULL,
    `status` ENUM('pending', 'paid', 'failed', 'refunded', 'partially_refunded') NOT NULL DEFAULT 'pending',
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'BDT',
    `transaction_id` VARCHAR(150) NULL,
    `provider` VARCHAR(50) NULL,
    `provider_payload` JSON NULL,
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `payments_order_id_idx`(`order_id`),
    INDEX `payments_status_idx`(`status`),
    INDEX `payments_transaction_id_idx`(`transaction_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `reviews` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `rating` INTEGER NOT NULL,
    `title` VARCHAR(150) NULL,
    `body` TEXT NULL,
    `is_approved` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `reviews_product_id_idx`(`product_id`),
    INDEX `reviews_is_approved_idx`(`is_approved`),
    UNIQUE INDEX `reviews_user_id_product_id_key`(`user_id`, `product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `notifications` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `type` VARCHAR(80) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `body` TEXT NULL,
    `data` JSON NULL,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_user_id_read_at_idx`(`user_id`, `read_at`),
    INDEX `notifications_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Foreign keys

ALTER TABLE `categories`
  ADD CONSTRAINT `categories_parent_id_fkey`
  FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `vendors`
  ADD CONSTRAINT `vendors_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `products`
  ADD CONSTRAINT `products_vendor_id_fkey`
  FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `products`
  ADD CONSTRAINT `products_category_id_fkey`
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `customer_addresses`
  ADD CONSTRAINT `customer_addresses_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `carts`
  ADD CONSTRAINT `carts_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `cart_items`
  ADD CONSTRAINT `cart_items_cart_id_fkey`
  FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `cart_items`
  ADD CONSTRAINT `cart_items_product_id_fkey`
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `wishlists`
  ADD CONSTRAINT `wishlists_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `wishlist_items`
  ADD CONSTRAINT `wishlist_items_wishlist_id_fkey`
  FOREIGN KEY (`wishlist_id`) REFERENCES `wishlists`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `wishlist_items`
  ADD CONSTRAINT `wishlist_items_product_id_fkey`
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `orders`
  ADD CONSTRAINT `orders_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_order_id_fkey`
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_product_id_fkey`
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `order_addresses`
  ADD CONSTRAINT `order_addresses_order_id_fkey`
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `payments`
  ADD CONSTRAINT `payments_order_id_fkey`
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `reviews`
  ADD CONSTRAINT `reviews_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `reviews`
  ADD CONSTRAINT `reviews_product_id_fkey`
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 20260323020000_user_username
-- AlterTable
ALTER TABLE `users` ADD COLUMN `username` VARCHAR(50) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_username_key` ON `users`(`username`);

-- 20260323030000_product_variants_and_media
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

-- 20260323040000_vendor_logo_and_history
-- Shop logo + change history

ALTER TABLE `vendors`
  ADD COLUMN `logo_id` BIGINT UNSIGNED NULL AFTER `user_id`,
  ADD UNIQUE INDEX `vendors_logo_id_key`(`logo_id`);

ALTER TABLE `vendors`
  ADD CONSTRAINT `vendors_logo_id_fkey`
    FOREIGN KEY (`logo_id`) REFERENCES `medias`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `vendor_histories` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `vendor_id` BIGINT UNSIGNED NOT NULL,
    `actor_id` BIGINT UNSIGNED NULL,
    `action` VARCHAR(40) NOT NULL,
    `changes` JSON NULL,
    `note` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `vendor_histories_vendor_id_created_at_idx`(`vendor_id`, `created_at`),
    INDEX `vendor_histories_actor_id_idx`(`actor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `vendor_histories`
  ADD CONSTRAINT `vendor_histories_vendor_id_fkey`
    FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `vendor_histories_actor_id_fkey`
    FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 20260323050000_product_brands
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

-- 20260325010000_category_icon
-- AlterTable
ALTER TABLE `categories` ADD COLUMN `icon` VARCHAR(80) NULL;

-- 20260325020000_brand_image
-- Brand logo / mark image

ALTER TABLE `brands`
  ADD COLUMN `image_id` BIGINT UNSIGNED NULL AFTER `id`,
  ADD UNIQUE INDEX `brands_image_id_key`(`image_id`);

ALTER TABLE `brands`
  ADD CONSTRAINT `brands_image_id_fkey`
    FOREIGN KEY (`image_id`) REFERENCES `medias`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 20260325030000_site_settings
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

-- 20260325040000_user_avatar_preset
-- Built-in SVG avatar presets for users without a photo

ALTER TABLE `users`
  ADD COLUMN `avatar_preset` VARCHAR(40) NULL AFTER `avatar_id`;

-- 20260325050000_visitor_country_analytics
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

-- 20260326010000_vendor_storefront_customization
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

-- 20260326020000_site_settings_shop_catalog
-- Storefront /shop catalog defaults on site settings
ALTER TABLE `site_settings`
  ADD COLUMN `shop_default_view` VARCHAR(16) NOT NULL DEFAULT 'grid4',
  ADD COLUMN `shop_products_per_page` INT NOT NULL DEFAULT 12;

-- 20260326030000_site_settings_shop_sidebar_facets
-- Shop sidebar facet preview counts + expand/collapse labels
ALTER TABLE `site_settings`
  ADD COLUMN `shop_categories_visible` INT NOT NULL DEFAULT 5,
  ADD COLUMN `shop_brands_visible` INT NOT NULL DEFAULT 6,
  ADD COLUMN `shop_see_all_label` VARCHAR(40) NOT NULL DEFAULT 'See all',
  ADD COLUMN `shop_show_less_label` VARCHAR(40) NOT NULL DEFAULT 'Show less';

-- 20260326040000_site_settings_history
-- Site settings change history (audit + clearable)
CREATE TABLE `site_settings_histories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `settings_id` INT NOT NULL DEFAULT 1,
  `actor_id` BIGINT UNSIGNED NULL,
  `action` VARCHAR(40) NOT NULL,
  `changes` JSON NULL,
  `note` VARCHAR(500) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `site_settings_histories_settings_id_created_at_idx` (`settings_id`, `created_at`),
  INDEX `site_settings_histories_actor_id_idx` (`actor_id`),
  CONSTRAINT `site_settings_histories_settings_id_fkey`
    FOREIGN KEY (`settings_id`) REFERENCES `site_settings` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `site_settings_histories_actor_id_fkey`
    FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 20260326050000_site_settings_favicon_login_logo
-- Favicon + login logo for site identity branding

ALTER TABLE `site_settings`
  ADD COLUMN `favicon_id` BIGINT UNSIGNED NULL,
  ADD COLUMN `login_logo_id` BIGINT UNSIGNED NULL;

CREATE UNIQUE INDEX `site_settings_favicon_id_key` ON `site_settings`(`favicon_id`);
CREATE UNIQUE INDEX `site_settings_login_logo_id_key` ON `site_settings`(`login_logo_id`);

ALTER TABLE `site_settings`
  ADD CONSTRAINT `site_settings_favicon_id_fkey`
    FOREIGN KEY (`favicon_id`) REFERENCES `medias`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `site_settings_login_logo_id_fkey`
    FOREIGN KEY (`login_logo_id`) REFERENCES `medias`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 20260326060000_site_chrome_nav_home
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

-- 20260326070000_home_hero_banner
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

-- 20260326080000_home_block_contents
-- Home page CMS blocks (JSON content per section key; hero stays separate).

CREATE TABLE `home_block_contents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(64) NOT NULL,
    `content` JSON NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `home_block_contents_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 20260929010000_social_login_providers
-- CreateTable
CREATE TABLE `social_login_providers` (
    `provider` VARCHAR(20) NOT NULL,
    `is_enabled` BOOLEAN NOT NULL DEFAULT false,
    `client_id` VARCHAR(255) NULL,
    `client_secret_enc` TEXT NULL,
    `team_id` VARCHAR(20) NULL,
    `key_id` VARCHAR(20) NULL,
    `private_key_enc` TEXT NULL,
    `updated_by` BIGINT UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`provider`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `user_sessions` MODIFY `login_method` ENUM('password', 'google', 'facebook', 'apple', 'refresh') NOT NULL DEFAULT 'password';

-- 20260929020000_sms_gateway_providers
-- CreateTable
CREATE TABLE `sms_gateway_providers` (
    `provider` VARCHAR(20) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `api_key_enc` TEXT NULL,
    `sender_id` VARCHAR(40) NULL,
    `account_sid` VARCHAR(40) NULL,
    `updated_by` BIGINT UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`provider`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 20260929030000_email_providers_mim_sms
-- AlterTable
ALTER TABLE `sms_gateway_providers` MODIFY `account_sid` VARCHAR(255) NULL;

-- CreateTable
CREATE TABLE `email_providers` (
    `provider` VARCHAR(20) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `host` VARCHAR(255) NULL,
    `port` INTEGER NULL,
    `secure` BOOLEAN NULL,
    `username` VARCHAR(255) NULL,
    `password_enc` TEXT NULL,
    `from_email` VARCHAR(255) NULL,
    `from_name` VARCHAR(100) NULL,
    `updated_by` BIGINT UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`provider`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 20260929040000_shipping_fees
-- AlterTable
ALTER TABLE `site_settings`
  ADD COLUMN `shipping_default_fee` DECIMAL(12, 2) NOT NULL DEFAULT 60,
  ADD COLUMN `shipping_free_threshold` DECIMAL(12, 2) NULL,
  ADD COLUMN `shipping_vendor_override` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `products` ADD COLUMN `shipping_fee` DECIMAL(12, 2) NULL;

-- 20260929050000_payment_gateways
-- CreateTable
CREATE TABLE `payment_gateways` (
    `provider` VARCHAR(20) NOT NULL,
    `is_enabled` BOOLEAN NOT NULL DEFAULT false,
    `store_id` VARCHAR(100) NULL,
    `store_password_enc` TEXT NULL,
    `is_live` BOOLEAN NOT NULL DEFAULT false,
    `updated_by` BIGINT UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`provider`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 20261001000000_cart_item_selected
-- AlterTable
ALTER TABLE `cart_items` ADD COLUMN `selected` BOOLEAN NOT NULL DEFAULT true;

-- 20261001020000_order_fulfilment
-- AlterTable
ALTER TABLE `orders`
    ADD COLUMN `payment_channel` VARCHAR(20) NULL AFTER `payment_method`,
    ADD COLUMN `courier_name` VARCHAR(80) NULL AFTER `payment_channel`,
    ADD COLUMN `tracking_number` VARCHAR(80) NULL AFTER `courier_name`,
    ADD COLUMN `shipped_at` DATETIME(3) NULL AFTER `placed_at`,
    ADD COLUMN `delivered_at` DATETIME(3) NULL AFTER `shipped_at`;

-- CreateIndex
CREATE INDEX `orders_payment_method_payment_channel_idx` ON `orders`(`payment_method`, `payment_channel`);

-- Backfill the wallet/card used for already-paid SSLCOMMERZ orders (mirrors paymentChannelFromCardType).
UPDATE `orders` o
JOIN (
    SELECT p.`order_id`,
           UPPER(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p.`provider_payload`, '$.validation.card_type')), '')) AS card_type
    FROM `payments` p
    WHERE p.`provider` = 'sslcommerz' AND p.`status` = 'paid'
) paid ON paid.`order_id` = o.`id`
SET o.`payment_channel` = CASE
    WHEN paid.card_type LIKE 'BKASH%' THEN 'bkash'
    WHEN paid.card_type LIKE 'NAGAD%' THEN 'nagad'
    WHEN paid.card_type LIKE 'DBBLMOBILE%' OR paid.card_type LIKE 'ROCKET%' THEN 'rocket'
    WHEN paid.card_type LIKE 'VISA%' OR paid.card_type LIKE 'MASTER%' OR paid.card_type LIKE 'AMEX%'
      OR paid.card_type LIKE 'UNIONPAY%' OR paid.card_type LIKE 'DINERS%' OR paid.card_type LIKE 'NEXUS%' THEN 'card'
    ELSE 'other'
END
WHERE o.`payment_method` = 'sslcommerz';

-- Timestamps for orders that already moved on.
UPDATE `orders` SET `shipped_at` = `updated_at` WHERE `status` IN ('shipped', 'delivered') AND `shipped_at` IS NULL;
UPDATE `orders` SET `delivered_at` = `updated_at` WHERE `status` = 'delivered' AND `delivered_at` IS NULL;

-- 20261001030000_product_reviews
-- AlterTable
ALTER TABLE `medias` MODIFY `collection_name` ENUM('product_images', 'vendor_banners', 'trade_licenses', 'avatars', 'site_banners', 'review_images') NOT NULL;

-- CreateTable
CREATE TABLE `product_reviews` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NULL,
    `order_id` BIGINT UNSIGNED NOT NULL,
    `author_name` VARCHAR(150) NOT NULL,
    `author_email` VARCHAR(255) NULL,
    `author_phone` VARCHAR(30) NULL,
    `rating` TINYINT UNSIGNED NOT NULL,
    `title` VARCHAR(150) NULL,
    `comment` TEXT NOT NULL,
    `images` JSON NULL,
    `is_verified_purchase` BOOLEAN NOT NULL DEFAULT true,
    `status` ENUM('pending', 'approved', 'hidden', 'rejected') NOT NULL DEFAULT 'approved',
    `flagged_at` DATETIME(3) NULL,
    `flag_reason` VARCHAR(255) NULL,
    `moderated_by` BIGINT UNSIGNED NULL,
    `moderated_at` DATETIME(3) NULL,
    `vendor_reply` TEXT NULL,
    `vendor_replied_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `product_reviews_product_id_status_idx`(`product_id`, `status`),
    INDEX `product_reviews_user_id_idx`(`user_id`),
    INDEX `product_reviews_author_email_idx`(`author_email`),
    INDEX `product_reviews_author_phone_idx`(`author_phone`),
    INDEX `product_reviews_status_created_at_idx`(`status`, `created_at`),
    INDEX `product_reviews_moderated_by_idx`(`moderated_by`),
    INDEX `product_reviews_deleted_at_idx`(`deleted_at`),
    UNIQUE INDEX `product_reviews_order_id_product_id_key`(`order_id`, `product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `product_reviews` ADD CONSTRAINT `product_reviews_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_reviews` ADD CONSTRAINT `product_reviews_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_reviews` ADD CONSTRAINT `product_reviews_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_reviews` ADD CONSTRAINT `product_reviews_moderated_by_fkey` FOREIGN KEY (`moderated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 20261001100000_showcase_seo
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

-- 20261001120000_content_pages
-- CreateTable
CREATE TABLE `content_pages` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `page_key` VARCHAR(40) NOT NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT true,
    `seo_title` VARCHAR(70) NULL,
    `seo_description` VARCHAR(170) NULL,
    `noindex` BOOLEAN NOT NULL DEFAULT false,
    `content` JSON NOT NULL,
    `updated_by_id` BIGINT UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `content_pages_page_key_key`(`page_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 20261015120000_category_bangla
-- Optional Bangla name / description for categories (slug stays shared).
ALTER TABLE `categories`
  ADD COLUMN `name_bn` VARCHAR(150) NULL AFTER `name`,
  ADD COLUMN `description_bn` TEXT NULL AFTER `description`;

-- 20261015130000_brand_bangla
-- Optional Bangla name / description for brands (slug stays shared).
ALTER TABLE `brands`
  ADD COLUMN `name_bn` VARCHAR(120) NULL AFTER `name`,
  ADD COLUMN `description_bn` VARCHAR(500) NULL AFTER `description`;

-- 20261015140000_store_bangla
-- Optional Bangla store name / description (slug stays shared).
ALTER TABLE `vendors`
  ADD COLUMN `shop_name_bn` VARCHAR(200) NULL AFTER `shop_name`,
  ADD COLUMN `description_bn` TEXT NULL AFTER `description`;

-- 20261015150000_product_bangla
-- Optional Bangla name / short description / description for products (slug stays shared).
ALTER TABLE `products`
  ADD COLUMN `name_bn` VARCHAR(255) NULL AFTER `name`,
  ADD COLUMN `short_description_bn` VARCHAR(500) NULL AFTER `short_description`,
  ADD COLUMN `description_bn` TEXT NULL AFTER `description`;

-- 20261016090000_whatsapp_gateway_providers
-- CreateTable
CREATE TABLE `whatsapp_gateway_providers` (
    `provider` VARCHAR(20) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `access_token_enc` TEXT NULL,
    `phone_number_id` VARCHAR(64) NULL,
    `account_sid` VARCHAR(255) NULL,
    `template_name` VARCHAR(100) NULL,
    `template_language` VARCHAR(12) NOT NULL DEFAULT 'en',
    `api_version` VARCHAR(16) NOT NULL DEFAULT 'v21.0',
    `template_button_param` BOOLEAN NOT NULL DEFAULT true,
    `updated_by` BIGINT UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`provider`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 20261023170000_order_kind
-- Wholesale (পাইকারি) orders are marked separately from shop-cart checkout.
ALTER TABLE `orders`
  ADD COLUMN `kind` ENUM('retail', 'wholesale') NOT NULL DEFAULT 'retail',
  ADD INDEX `orders_kind_idx` (`kind`);

-- 20261024140000_shop_pagination_mode
-- Storefront /shop: numbered pages or infinite scroll. Chosen in site settings.
ALTER TABLE `site_settings`
  ADD COLUMN `shop_pagination_mode` VARCHAR(16) NOT NULL DEFAULT 'pages';

-- 20261024150000_site_settings_login_image
-- Photo shown on the right side of the storefront login and register screens.

ALTER TABLE `site_settings`
  ADD COLUMN `login_image_id` BIGINT UNSIGNED NULL;

CREATE UNIQUE INDEX `site_settings_login_image_id_key` ON `site_settings`(`login_image_id`);

ALTER TABLE `site_settings`
  ADD CONSTRAINT `site_settings_login_image_id_fkey`
    FOREIGN KEY (`login_image_id`) REFERENCES `medias`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `users` (
  `first_name`, `last_name`, `username`, `email`, `phone`, `password`,
  `role`, `status`, `email_verified_at`, `phone_verified_at`, `created_at`, `updated_at`
) VALUES (
  'Super', 'Admin', 'superadmin', 'superadmin@niyenin.local', '+8801700000001',
  '$2b$12$kuwz6Mvr09pioj7Uh3R65uJ1b.WzB50lR2/.h3lnLd5IeNacv3vwe', 'super_admin', 'active', NOW(3), NOW(3), NOW(3), NOW(3)
);

SET FOREIGN_KEY_CHECKS=1;
