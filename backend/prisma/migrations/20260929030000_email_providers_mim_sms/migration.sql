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
