-- Storefront /shop: numbered pages or infinite scroll. Chosen in site settings.
ALTER TABLE `site_settings`
  ADD COLUMN `shop_pagination_mode` VARCHAR(16) NOT NULL DEFAULT 'pages';
