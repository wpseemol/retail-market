-- AlterEnum
ALTER TABLE `medias` MODIFY `collection_name` ENUM('product_images', 'vendor_banners', 'trade_licenses', 'avatars', 'site_banners', 'review_images', 'brand_banners', 'showcase_og', 'seller_kyc') NOT NULL;

-- CreateTable
CREATE TABLE `kyc_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `mode` ENUM('staff', 'paid_api') NOT NULL DEFAULT 'staff',
    `provider` VARCHAR(40) NULL,
    `api_key_enc` TEXT NULL,
    `api_base_url` VARCHAR(255) NULL,
    `is_enabled` BOOLEAN NOT NULL DEFAULT false,
    `partner_terms` JSON NULL,
    `updated_by` BIGINT UNSIGNED NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seller_applications` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `shop_name` VARCHAR(200) NULL,
    `shop_name_bn` VARCHAR(200) NULL,
    `description` TEXT NULL,
    `contact_phone` VARCHAR(30) NULL,
    `business_address` VARCHAR(500) NULL,
    `status` ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected') NOT NULL DEFAULT 'draft',
    `rejection_reason` VARCHAR(1000) NULL,
    `accepted_fee_terms_at` DATETIME(3) NULL,
    `fee_snapshot` JSON NULL,
    `kyc_provider_result` JSON NULL,
    `vendor_id` BIGINT UNSIGNED NULL,
    `reviewed_by_id` BIGINT UNSIGNED NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `seller_applications_vendor_id_key`(`vendor_id`),
    INDEX `seller_applications_user_id_status_idx`(`user_id`, `status`),
    INDEX `seller_applications_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seller_application_documents` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `application_id` BIGINT UNSIGNED NOT NULL,
    `doc_type` ENUM('nid_front', 'nid_back', 'birth_certificate', 'trade_license', 'other') NOT NULL,
    `media_id` BIGINT UNSIGNED NOT NULL,
    `label` VARCHAR(120) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `seller_application_documents_media_id_idx`(`media_id`),
    UNIQUE INDEX `seller_application_documents_application_id_doc_type_key`(`application_id`, `doc_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `seller_applications` ADD CONSTRAINT `seller_applications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seller_applications` ADD CONSTRAINT `seller_applications_reviewed_by_id_fkey` FOREIGN KEY (`reviewed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seller_applications` ADD CONSTRAINT `seller_applications_vendor_id_fkey` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seller_application_documents` ADD CONSTRAINT `seller_application_documents_application_id_fkey` FOREIGN KEY (`application_id`) REFERENCES `seller_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seller_application_documents` ADD CONSTRAINT `seller_application_documents_media_id_fkey` FOREIGN KEY (`media_id`) REFERENCES `medias`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
