-- Site settings change history (audit + clearable)
CREATE TABLE `site_settings_histories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `settings_id` INT NOT NULL DEFAULT 1,
  `actor_id` BIGINT UNSIGNED NULL,
  `action` VARCHAR(40) NOT NULL,
  `changes` JSON NULL,
  `note` VARCHAR(500) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `site_settings_histories_settings_id_created_at_idx` (`settings_id`, `created_at`),
  INDEX `site_settings_histories_actor_id_idx` (`actor_id`),
  CONSTRAINT `site_settings_histories_settings_id_fkey`
    FOREIGN KEY (`settings_id`) REFERENCES `site_settings` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `site_settings_histories_actor_id_fkey`
    FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
