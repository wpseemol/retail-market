-- Built-in SVG avatar presets for users without a photo

ALTER TABLE `users`
  ADD COLUMN `avatar_preset` VARCHAR(40) NULL AFTER `avatar_id`;
