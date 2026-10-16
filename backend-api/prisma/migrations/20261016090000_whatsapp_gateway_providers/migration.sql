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
