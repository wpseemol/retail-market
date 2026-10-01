-- Storefront /shop catalog defaults on site settings
ALTER TABLE `site_settings`
  ADD COLUMN `shop_default_view` VARCHAR(16) NOT NULL DEFAULT 'grid4',
  ADD COLUMN `shop_products_per_page` INT NOT NULL DEFAULT 12;
