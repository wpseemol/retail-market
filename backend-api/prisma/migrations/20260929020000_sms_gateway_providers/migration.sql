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
