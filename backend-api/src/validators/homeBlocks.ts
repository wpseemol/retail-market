import { z } from "zod";
import { HOME_BLOCK_KEYS } from "../lib/homeBlocks.js";
import { withSafeInput } from "./customerAuth.js";
import { updateWelcomeModalSchema } from "./welcomeModal.js";

/** CMS home-block path param (`:key`). */
export const homeBlockKeySchema = z.enum(HOME_BLOCK_KEYS);

const safe = (min: number, max: number) =>
  withSafeInput(z.string().trim().min(min).max(max));
const safeOpt = (max: number) => withSafeInput(z.string().trim().max(max));
const percent = z.coerce.number().int().min(0).max(100);
const path = safe(1, 500);

/** Storefront-relative path (`/shop/slug`). Rejects schemes and protocol-relative URLs. */
const storefrontHref = safe(1, 300).superRefine((value, ctx) => {
  if (!value.startsWith("/") || value.startsWith("//")) {
    ctx.addIssue({
      code: "custom",
      message: "Link must start with / (e.g. /shop/your-product-slug)",
    });
    return;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    ctx.addIssue({ code: "custom", message: "Link cannot use a URL scheme" });
  }
});

/** Legacy `/shop?product=slug` → canonical `/shop/slug`. */
const promoCtaHref = storefrontHref.transform((value) => {
  const match = value.match(/^\/shop\/?\?product=([^&/#]+)/i);
  if (!match?.[1]) return value;
  try {
    return `/shop/${decodeURIComponent(match[1])}`;
  } catch {
    return `/shop/${match[1]}`;
  }
});
const sortEnum = z.enum([
  "newest",
  "default",
  "price-asc",
  "price-desc",
  "name-asc",
]);

export const homeBlockContentSchemas = {
  welcome_modal: updateWelcomeModalSchema,
  featured: z.object({
    items: z
      .array(
        z.object({
          title: safe(1, 80),
          description: safe(1, 160),
          icon: path,
          alt: safe(1, 120),
        }),
      )
      .min(1)
      .max(8),
  }),
  deals_banner: z.object({
    cards: z
      .array(
        z.object({
          title_top: safe(1, 60),
          title_bottom: safe(1, 60),
          discount_percent: percent,
          image: path,
          alt: safe(1, 120),
          href: safe(1, 300),
          cta_label: safe(1, 40),
        }),
      )
      .min(1)
      .max(8),
  }),
  product_groups: z.object({
    title: safe(1, 80),
    note: safeOpt(300).optional(),
  }),
  promo_slider: z.object({
    bg_image: path,
    autoplay_ms: z.coerce.number().int().min(2000).max(20000),
    slides: z
      .array(
        z.object({
          price: safe(1, 40),
          tagline: safe(1, 60),
          highlight_text: safe(1, 40),
          sub_highlight: safe(1, 40),
          category_tag: safe(1, 40),
          title_line1: safe(1, 80),
          title_line2: safe(1, 80),
          cta_label: safe(1, 40),
          cta_href: promoCtaHref,
          image: path,
          image_alt: safe(1, 120),
        }),
      )
      .min(1)
      .max(8),
  }),
  best_sellers: z.object({
    title: safe(1, 80),
    promo_badge: safe(1, 40),
    promo_headline: safe(1, 120),
    promo_discount_percent: percent,
    promo_cta_label: safe(1, 40),
    promo_cta_href: safe(1, 300),
    promo_image: path,
    product_sort: sortEnum,
    product_limit: z.coerce.number().int().min(4).max(24),
  }),
  latest_products: z.object({
    title: safe(1, 80),
    sidebar_title: safe(1, 80),
    product_sort: sortEnum,
    product_limit: z.coerce.number().int().min(4).max(24),
    sidebar_limit: z.coerce.number().int().min(2).max(12),
  }),
  deals_of_day: z.object({
    title: safe(1, 80),
    left_badge: safe(1, 40),
    left_headline: safe(1, 120),
    left_cta_label: safe(1, 40),
    left_cta_href: storefrontHref,
    left_image: path,
    left_bg: path,
    autoplay_ms: z.coerce.number().int().min(2000).max(20000),
    deal_ends_at: safe(1, 40),
    center_slides: z
      .array(
        z.object({
          brand: safe(1, 60),
          title: safe(1, 80),
          subtitle: safe(1, 120),
          price: z.coerce.number().min(0).max(10_000_000),
          original_price: z.coerce.number().min(0).max(10_000_000),
          discount_percent: percent,
          rating: z.coerce.number().int().min(0).max(5),
          main_image: path,
          thumb_image: path,
          alt: safe(1, 120),
          href: storefrontHref,
        }),
      )
      .min(1)
      .max(8),
    right_slides: z
      .array(
        z.object({
          name: safe(1, 120),
          price: z.coerce.number().min(0).max(10_000_000),
          original_price: z.coerce.number().min(0).max(10_000_000),
          discount_percent: percent,
          rating: z.coerce.number().int().min(0).max(5),
          available: z.coerce.number().int().min(0).max(1_000_000),
          sold_out: z.coerce.number().int().min(0).max(1_000_000),
          main_image: path,
          thumb_image: path,
          alt: safe(1, 120),
          href: storefrontHref,
        }),
      )
      .min(1)
      .max(8),
  }),
  laptop_repair: z.object({
    badge_label: safe(1, 40),
    headline_line1: safe(1, 80),
    headline_line2: safe(1, 80),
    subtext: safeOpt(200).optional(),
    offer_percent: percent,
    offer_label: safe(1, 40),
    cta_label: safe(1, 40),
    cta_href: safe(1, 300),
    bg_image: path,
    product_image: path,
  }),
  top_brands: z.object({
    title: safe(1, 80),
    see_all_label: safe(1, 40),
    see_all_href: safe(1, 300),
    brands: z
      .array(
        z.object({
          name: safe(1, 60),
          href: safe(1, 300),
          image: z
            .union([path, z.literal(""), z.null()])
            .transform((v) => (v === "" ? null : v))
            .optional(),
        }),
      )
      .min(1)
      .max(16),
  }),
} as const;
