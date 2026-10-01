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
