-- Brand logo / mark image

ALTER TABLE `brands`
  ADD COLUMN `image_id` BIGINT UNSIGNED NULL AFTER `id`,
  ADD UNIQUE INDEX `brands_image_id_key`(`image_id`);

ALTER TABLE `brands`
  ADD CONSTRAINT `brands_image_id_fkey`
    FOREIGN KEY (`image_id`) REFERENCES `medias`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
