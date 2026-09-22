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
