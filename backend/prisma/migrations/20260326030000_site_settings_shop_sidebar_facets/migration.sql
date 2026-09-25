-- Shop sidebar facet preview counts + expand/collapse labels
ALTER TABLE `site_settings`
  ADD COLUMN `shop_categories_visible` INT NOT NULL DEFAULT 5,
  ADD COLUMN `shop_brands_visible` INT NOT NULL DEFAULT 6,
  ADD COLUMN `shop_see_all_label` VARCHAR(40) NOT NULL DEFAULT 'See all',
  ADD COLUMN `shop_show_less_label` VARCHAR(40) NOT NULL DEFAULT 'Show less';
