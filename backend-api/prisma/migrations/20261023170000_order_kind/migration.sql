-- Wholesale (পাইকারি) orders are marked separately from shop-cart checkout.
ALTER TABLE `orders`
  ADD COLUMN `kind` ENUM('retail', 'wholesale') NOT NULL DEFAULT 'retail',
  ADD INDEX `orders_kind_idx` (`kind`);
