-- Photo shown on the right side of the storefront login and register screens.

ALTER TABLE `site_settings`
  ADD COLUMN `login_image_id` BIGINT UNSIGNED NULL;

CREATE UNIQUE INDEX `site_settings_login_image_id_key` ON `site_settings`(`login_image_id`);

ALTER TABLE `site_settings`
  ADD CONSTRAINT `site_settings_login_image_id_fkey`
    FOREIGN KEY (`login_image_id`) REFERENCES `medias`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
