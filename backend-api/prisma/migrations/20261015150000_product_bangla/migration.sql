-- Optional Bangla name / short description / description for products (slug stays shared).
ALTER TABLE `products`
  ADD COLUMN `name_bn` VARCHAR(255) NULL AFTER `name`,
  ADD COLUMN `short_description_bn` VARCHAR(500) NULL AFTER `short_description`,
  ADD COLUMN `description_bn` TEXT NULL AFTER `description`;
