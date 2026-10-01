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
