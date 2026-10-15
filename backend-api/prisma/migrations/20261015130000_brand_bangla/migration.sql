-- Optional Bangla name / description for brands (slug stays shared).
ALTER TABLE `brands`
  ADD COLUMN `name_bn` VARCHAR(120) NULL AFTER `name`,
  ADD COLUMN `description_bn` VARCHAR(500) NULL AFTER `description`;
