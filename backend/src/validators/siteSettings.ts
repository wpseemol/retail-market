import { z } from "zod";
import { withSafeInput } from "./customerAuth.js";

const emptyToNull = (value: string | null | undefined) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

function optionalSafeId(
  pattern: RegExp,
  message: string,
  max = 80,
) {
  return z
    .union([
      withSafeInput(
        z
          .string()
          .trim()
          .max(max)
          .regex(pattern, message),
      ),
      z.literal(""),
      z.null(),
    ])
    .optional()
    .transform(emptyToNull);
}

export const updateSiteSettingsSchema = z.object({
  site_name: withSafeInput(z.string().trim().min(2).max(120)),
  site_title: withSafeInput(z.string().trim().min(2).max(160)),
  site_description: withSafeInput(z.string().trim().min(10).max(500)),
  keywords: z
    .union([withSafeInput(z.string().trim().max(500)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull),

  og_title: z
    .union([withSafeInput(z.string().trim().max(160)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull),
  og_description: z
    .union([withSafeInput(z.string().trim().max(500)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull),

  twitter_title: z
    .union([withSafeInput(z.string().trim().max(160)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull),
  twitter_description: z
    .union([withSafeInput(z.string().trim().max(500)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull),
  twitter_handle: z
    .union([
      withSafeInput(
        z
          .string()
          .trim()
          .max(80)
          .regex(/^@?[A-Za-z0-9_]{1,50}$/, "Invalid Twitter/X handle"),
      ),
      z.literal(""),
      z.null(),
    ])
    .optional()
    .transform((value) => {
      const next = emptyToNull(value);
      if (!next) return next;
      return next.startsWith("@") ? next : `@${next}`;
    }),

  google_analytics_id: optionalSafeId(
    /^G-[A-Z0-9]+$/i,
    "Google Analytics ID must look like G-XXXXXXXX",
    40,
  ),
  google_analytics_enabled: z.boolean().optional(),
  google_tag_manager_id: optionalSafeId(
    /^GTM-[A-Z0-9]+$/i,
    "GTM ID must look like GTM-XXXXXXX",
    40,
  ),
  google_tag_manager_enabled: z.boolean().optional(),
  hotjar_site_id: optionalSafeId(/^\d{5,10}$/, "Hotjar site ID must be numeric", 40),
  hotjar_enabled: z.boolean().optional(),
  plerdy_site_id: optionalSafeId(
    /^[A-Za-z0-9_-]{4,80}$/,
    "Invalid Plerdy site ID",
    80,
  ),
  plerdy_enabled: z.boolean().optional(),

  google_ads_id: optionalSafeId(
    /^AW-\d+$/i,
    "Google Ads ID must look like AW-123456789",
    40,
  ),
  google_ads_enabled: z.boolean().optional(),
  tiktok_pixel_id: optionalSafeId(
    /^[A-Z0-9]{10,80}$/i,
    "Invalid TikTok pixel ID",
    80,
  ),
  tiktok_enabled: z.boolean().optional(),
  linkedin_partner_id: optionalSafeId(
    /^\d{5,12}$/,
    "LinkedIn partner ID must be numeric",
    40,
  ),
  linkedin_enabled: z.boolean().optional(),
  twitter_pixel_id: optionalSafeId(
    /^[A-Za-z0-9_]{5,80}$/,
    "Invalid Twitter/X pixel ID",
    80,
  ),
  twitter_pixel_enabled: z.boolean().optional(),
  meta_pixel_id: optionalSafeId(
    /^\d{5,20}$/,
    "Meta (Facebook) Pixel ID must be numeric",
    40,
  ),
  meta_pixel_enabled: z.boolean().optional(),

  shop_default_view: z
    .enum(["grid4", "grid3", "grid2", "list"])
    .optional(),
  shop_products_per_page: z.coerce
    .number()
    .int()
    .min(4)
    .max(48)
    .optional(),
  shop_categories_visible: z.coerce.number().int().min(1).max(50).optional(),
  shop_brands_visible: z.coerce.number().int().min(1).max(50).optional(),
  shop_see_all_label: withSafeInput(z.string().trim().min(1).max(40)).optional(),
  shop_show_less_label: withSafeInput(z.string().trim().min(1).max(40)).optional(),

  topbar_email: z
    .union([withSafeInput(z.string().trim().max(160)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull),
  topbar_phone: z
    .union([withSafeInput(z.string().trim().max(40)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull),
  footer_blurb: z
    .union([withSafeInput(z.string().trim().max(500)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull),
  footer_phone: z
    .union([withSafeInput(z.string().trim().max(40)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull),
  footer_callout: z
    .union([withSafeInput(z.string().trim().max(120)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull),
  social_facebook: z
    .union([withSafeInput(z.string().trim().max(300)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull),
  social_twitter: z
    .union([withSafeInput(z.string().trim().max(300)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull),
  social_youtube: z
    .union([withSafeInput(z.string().trim().max(300)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull),
  social_linkedin: z
    .union([withSafeInput(z.string().trim().max(300)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull),
  social_instagram: z
    .union([withSafeInput(z.string().trim().max(300)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull),
});

export const updateSiteChromeSchema = z.object({
  topbar_email: z
    .union([withSafeInput(z.string().trim().max(160)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull),
  topbar_phone: z
    .union([withSafeInput(z.string().trim().max(40)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull),
  footer_blurb: z
    .union([withSafeInput(z.string().trim().max(500)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull),
  footer_phone: z
    .union([withSafeInput(z.string().trim().max(40)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull),
  footer_callout: z
    .union([withSafeInput(z.string().trim().max(120)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull),
  social_facebook: z
    .union([withSafeInput(z.string().trim().max(300)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull),
  social_twitter: z
    .union([withSafeInput(z.string().trim().max(300)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull),
  social_youtube: z
    .union([withSafeInput(z.string().trim().max(300)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull),
  social_linkedin: z
    .union([withSafeInput(z.string().trim().max(300)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull),
  social_instagram: z
    .union([withSafeInput(z.string().trim().max(300)), z.literal(""), z.null()])
    .optional()
    .transform(emptyToNull),
});

const navMenuEnum = z.enum([
  "header",
  "footer_find",
  "footer_care",
  "footer_sell",
]);

export const createSiteNavItemSchema = z.object({
  menu: navMenuEnum,
  label: withSafeInput(z.string().trim().min(1).max(120)),
  href: withSafeInput(z.string().trim().min(1).max(500)),
  external: z.boolean().optional().default(false),
  is_enabled: z.boolean().optional().default(true),
  parent_id: z
    .union([z.string().regex(/^\d+$/), z.null()])
    .optional()
    .nullable(),
});

export const updateSiteNavItemSchema = z.object({
  label: withSafeInput(z.string().trim().min(1).max(120)).optional(),
  href: withSafeInput(z.string().trim().min(1).max(500)).optional(),
  external: z.boolean().optional(),
  is_enabled: z.boolean().optional(),
  parent_id: z
    .union([z.string().regex(/^\d+$/), z.null()])
    .optional()
    .nullable(),
});

export const reorderSiteNavSchema = z.object({
  menu: navMenuEnum,
  ordered_ids: z.array(z.string().regex(/^\d+$/)).min(1),
});

export const reorderHomeSectionsSchema = z.object({
  ordered_ids: z.array(z.string().regex(/^\d+$/)).min(1),
});

export const updateHomeSectionSchema = z.object({
  is_enabled: z.boolean().optional(),
  label: withSafeInput(z.string().trim().min(1).max(120)).optional(),
});

export type UpdateSiteSettingsInput = z.infer<typeof updateSiteSettingsSchema>;
export const SHOP_VIEW_MODES = ["grid4", "grid3", "grid2", "list"] as const;