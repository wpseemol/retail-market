-- Store fee plans + multi-user store teams + per-order vendor settlements.

CREATE TABLE `vendor_members` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `vendor_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `role` ENUM('owner', 'helper') NOT NULL DEFAULT 'helper',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE INDEX `vendor_members_vendor_id_user_id_key`(`vendor_id`, `user_id`),
    UNIQUE INDEX `vendor_members_user_id_key`(`user_id`),
    INDEX `vendor_members_vendor_id_role_idx`(`vendor_id`, `role`),
    CONSTRAINT `vendor_members_vendor_id_fkey` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `vendor_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `order_vendor_settlements` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT UNSIGNED NOT NULL,
    `vendor_id` BIGINT UNSIGNED NULL,
    `shop_name` VARCHAR(200) NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `discount_share` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `commission_percent` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `platform_fee` DECIMAL(12, 2) NOT NULL,
    `vendor_net` DECIMAL(12, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    UNIQUE INDEX `order_vendor_settlements_order_id_vendor_id_key`(`order_id`, `vendor_id`),
    INDEX `order_vendor_settlements_vendor_id_idx`(`vendor_id`),
    INDEX `order_vendor_settlements_order_id_idx`(`order_id`),
    CONSTRAINT `order_vendor_settlements_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `order_vendor_settlements_vendor_id_fkey` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Fee columns on vendors (after enums exist via ALTER).
ALTER TABLE `vendors`
    ADD COLUMN `fee_plan` ENUM('commission', 'rent', 'both') NOT NULL DEFAULT 'commission',
    ADD COLUMN `commission_percent` DECIMAL(5, 2) NULL,
    ADD COLUMN `rent_amount` DECIMAL(12, 2) NULL,
    ADD COLUMN `rent_period` ENUM('monthly', 'yearly') NULL;

-- Default partner stores to 3% commission; house/null stays 0 until set.
UPDATE `vendors`
SET `commission_percent` = 3.00
WHERE `deleted_at` IS NULL
  AND `commission_percent` IS NULL;

-- Backfill owner membership from vendors.user_id.
INSERT INTO `vendor_members` (`vendor_id`, `user_id`, `role`, `created_at`, `updated_at`)
SELECT `id`, `user_id`, 'owner', NOW(3), NOW(3)
FROM `vendors`
WHERE `deleted_at` IS NULL
ON DUPLICATE KEY UPDATE `role` = 'owner', `updated_at` = NOW(3);
