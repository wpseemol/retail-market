-- Optional Bangla name / description for categories (slug stays shared).
ALTER TABLE `categories`
  ADD COLUMN `name_bn` VARCHAR(150) NULL AFTER `name`,
  ADD COLUMN `description_bn` TEXT NULL AFTER `description`;
