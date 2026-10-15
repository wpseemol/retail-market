-- Optional Bangla store name / description (slug stays shared).
ALTER TABLE `vendors`
  ADD COLUMN `shop_name_bn` VARCHAR(200) NULL AFTER `shop_name`,
  ADD COLUMN `description_bn` TEXT NULL AFTER `description`;
