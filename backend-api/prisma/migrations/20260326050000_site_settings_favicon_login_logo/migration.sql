-- Favicon + login logo for site identity branding

ALTER TABLE `site_settings`
  ADD COLUMN `favicon_id` BIGINT UNSIGNED NULL,
  ADD COLUMN `login_logo_id` BIGINT UNSIGNED NULL;

CREATE UNIQUE INDEX `site_settings_favicon_id_key` ON `site_settings`(`favicon_id`);
CREATE UNIQUE INDEX `site_settings_login_logo_id_key` ON `site_settings`(`login_logo_id`);

ALTER TABLE `site_settings`
  ADD CONSTRAINT `site_settings_favicon_id_fkey`
    FOREIGN KEY (`favicon_id`) REFERENCES `medias`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `site_settings_login_logo_id_fkey`
    FOREIGN KEY (`login_logo_id`) REFERENCES `medias`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
