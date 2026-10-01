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
