-- AlterTable
ALTER TABLE `orders`
    ADD COLUMN `payment_channel` VARCHAR(20) NULL AFTER `payment_method`,
    ADD COLUMN `courier_name` VARCHAR(80) NULL AFTER `payment_channel`,
    ADD COLUMN `tracking_number` VARCHAR(80) NULL AFTER `courier_name`,
    ADD COLUMN `shipped_at` DATETIME(3) NULL AFTER `placed_at`,
    ADD COLUMN `delivered_at` DATETIME(3) NULL AFTER `shipped_at`;

-- CreateIndex
CREATE INDEX `orders_payment_method_payment_channel_idx` ON `orders`(`payment_method`, `payment_channel`);

-- Backfill the wallet/card used for already-paid SSLCOMMERZ orders (mirrors paymentChannelFromCardType).
UPDATE `orders` o
JOIN (
    SELECT p.`order_id`,
           UPPER(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p.`provider_payload`, '$.validation.card_type')), '')) AS card_type
    FROM `payments` p
    WHERE p.`provider` = 'sslcommerz' AND p.`status` = 'paid'
) paid ON paid.`order_id` = o.`id`
SET o.`payment_channel` = CASE
    WHEN paid.card_type LIKE 'BKASH%' THEN 'bkash'
    WHEN paid.card_type LIKE 'NAGAD%' THEN 'nagad'
    WHEN paid.card_type LIKE 'DBBLMOBILE%' OR paid.card_type LIKE 'ROCKET%' THEN 'rocket'
    WHEN paid.card_type LIKE 'VISA%' OR paid.card_type LIKE 'MASTER%' OR paid.card_type LIKE 'AMEX%'
      OR paid.card_type LIKE 'UNIONPAY%' OR paid.card_type LIKE 'DINERS%' OR paid.card_type LIKE 'NEXUS%' THEN 'card'
    ELSE 'other'
END
WHERE o.`payment_method` = 'sslcommerz';

-- Timestamps for orders that already moved on.
UPDATE `orders` SET `shipped_at` = `updated_at` WHERE `status` IN ('shipped', 'delivered') AND `shipped_at` IS NULL;
UPDATE `orders` SET `delivered_at` = `updated_at` WHERE `status` = 'delivered' AND `delivered_at` IS NULL;
