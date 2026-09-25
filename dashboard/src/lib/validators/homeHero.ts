import { z } from "zod";
import { findUnsafeInputReason, validateSafeImageFile, withSafeInput } from "./safeInput";

export const HOME_HERO_IMAGE_MAX_BYTES = 1 * 1024 * 1024;

export const HOME_HERO_IMAGE_SLOTS = [
  "main_product",
  "main_bg",
  "side_product",
  "side_bg",
] as const;

export type HomeHeroImageSlot = (typeof HOME_HERO_IMAGE_SLOTS)[number];

function optionalSafe(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .superRefine((val, ctx) => {
      if (!val) return;
      const reason = findUnsafeInputReason(val);
      if (reason) ctx.addIssue({ code: "custom", message: reason });
    });
}

/** Optional 0–100; empty inputs set `null` in the form onChange. */
const optionalPercent = z.number().int().min(0).max(100).nullable();

export const homeHeroFormSchema = z.object({
  main_eyebrow: withSafeInput(
    z.string().trim().min(1, "Eyebrow is required").max(120),
  ),
  main_headline: withSafeInput(
    z.string().trim().min(2, "Headline is required").max(200),
  ),
  main_subtext: optionalSafe(300),
  main_discount_percent: optionalPercent,
  main_price_label: optionalSafe(40),
  main_cta_label: withSafeInput(
    z.string().trim().min(1, "CTA label is required").max(40),
  ),
  main_cta_href: withSafeInput(
    z.string().trim().min(1, "CTA link is required").max(300),
  ),
  side_badge_label: optionalSafe(40),
  side_offer_percent: optionalPercent,
  side_offer_label: optionalSafe(40),
  side_headline: withSafeInput(
    z.string().trim().min(2, "Side headline is required").max(200),
  ),
  side_discount_percent: optionalPercent,
  side_cta_label: withSafeInput(
    z.string().trim().min(1, "CTA label is required").max(40),
  ),
  side_cta_href: withSafeInput(
    z.string().trim().min(1, "CTA link is required").max(300),
  ),
});

export type HomeHeroFormValues = z.infer<typeof homeHeroFormSchema>;

export type HomeHeroMedia = {
  path: string;
  alt_text?: string | null;
} | null;

export type HomeHeroDto = {
  main: {
    eyebrow: string;
    headline: string;
    subtext: string | null;
    discount_percent: number | null;
    price_label: string | null;
    cta_label: string;
    cta_href: string;
    product_image: HomeHeroMedia;
    bg_image: HomeHeroMedia;
  };
  side: {
    badge_label: string | null;
    offer_percent: number | null;
    offer_label: string | null;
    headline: string;
    discount_percent: number | null;
    cta_label: string;
    cta_href: string;
    product_image: HomeHeroMedia;
    bg_image: HomeHeroMedia;
  };
  main_product_image_id?: string | null;
  main_bg_image_id?: string | null;
  side_product_image_id?: string | null;
  side_bg_image_id?: string | null;
  updated_at?: string;
};

export type HomeHeroApiResponse = {
  message?: string;
  hero: HomeHeroDto;
};

export function heroToFormValues(hero: HomeHeroDto): HomeHeroFormValues {
  return {
    main_eyebrow: hero.main.eyebrow,
    main_headline: hero.main.headline,
    main_subtext: hero.main.subtext ?? "",
    main_discount_percent: hero.main.discount_percent,
    main_price_label: hero.main.price_label ?? "",
    main_cta_label: hero.main.cta_label,
    main_cta_href: hero.main.cta_href,
    side_badge_label: hero.side.badge_label ?? "",
    side_offer_percent: hero.side.offer_percent,
    side_offer_label: hero.side.offer_label ?? "",
    side_headline: hero.side.headline,
    side_discount_percent: hero.side.discount_percent,
    side_cta_label: hero.side.cta_label,
    side_cta_href: hero.side.cta_href,
  };
}

export function validateHomeHeroImageFile(file: File | null | undefined) {
  return validateSafeImageFile(file, HOME_HERO_IMAGE_MAX_BYTES, "Hero image");
}
