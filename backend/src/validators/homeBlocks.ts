import { z } from "zod";
import { withSafeInput } from "./customerAuth.js";
import { updateWelcomeModalSchema } from "./welcomeModal.js";

const safe = (min: number, max: number) =>
  withSafeInput(z.string().trim().min(min).max(max));
const safeOpt = (max: number) => withSafeInput(z.string().trim().max(max));
const percent = z.coerce.number().int().min(0).max(100);
const path = safe(1, 500);
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
          cta_href: safe(1, 300),
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
    left_cta_href: safe(1, 300),
    left_image: path,
    left_bg: path,
    product_sort: sortEnum,
    product_limit: z.coerce.number().int().min(2).max(12),
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
