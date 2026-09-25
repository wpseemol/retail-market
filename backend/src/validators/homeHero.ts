import { z } from "zod";
import { withSafeInput } from "./customerAuth.js";

const emptyToNull = (value: string | null | undefined) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const optionalSafe = (max: number) =>
  z
    .union([withSafeInput(z.string().trim().max(max)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull);

const optionalPercent = z
  .union([z.coerce.number().int().min(0).max(100), z.null()])
  .optional();

export const updateHomeHeroSchema = z.object({
  main_eyebrow: withSafeInput(z.string().trim().min(1).max(120)).optional(),
  main_headline: withSafeInput(z.string().trim().min(2).max(200)).optional(),
  main_subtext: optionalSafe(300),
  main_discount_percent: optionalPercent,
  main_price_label: optionalSafe(40),
  main_cta_label: withSafeInput(z.string().trim().min(1).max(40)).optional(),
  main_cta_href: withSafeInput(z.string().trim().min(1).max(300)).optional(),

  side_badge_label: optionalSafe(40),
  side_offer_percent: optionalPercent,
  side_offer_label: optionalSafe(40),
  side_headline: withSafeInput(z.string().trim().min(2).max(200)).optional(),
  side_discount_percent: optionalPercent,
  side_cta_label: withSafeInput(z.string().trim().min(1).max(40)).optional(),
  side_cta_href: withSafeInput(z.string().trim().min(1).max(300)).optional(),
});

export const HOME_HERO_IMAGE_SLOTS = [
  "main_product",
  "main_bg",
  "side_product",
  "side_bg",
] as const;

export type HomeHeroImageSlot = (typeof HOME_HERO_IMAGE_SLOTS)[number];

export const homeHeroImageSlotSchema = z.enum(HOME_HERO_IMAGE_SLOTS);

export type UpdateHomeHeroInput = z.infer<typeof updateHomeHeroSchema>;
