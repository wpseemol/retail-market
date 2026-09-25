import { z } from "zod";
import { findUnsafeInputReason, validateSafeImageFile, withSafeInput } from "./safeInput";

export const OG_IMAGE_MAX_BYTES = 1 * 1024 * 1024;

/** Optional string field: safe-input guarded, valid when empty. */
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

/** Optional tracker/pixel ID: safe-input + format pattern, valid when empty. */
function optionalTrackerId(pattern: RegExp, msg: string, max = 80) {
  return z
    .string()
    .trim()
    .max(max)
    .superRefine((val, ctx) => {
      if (!val) return;
      const reason = findUnsafeInputReason(val);
      if (reason) {
        ctx.addIssue({ code: "custom", message: reason });
        return;
      }
      if (!pattern.test(val)) {
        ctx.addIssue({ code: "custom", message: msg });
      }
    });
}

export const siteSettingsFormSchema = z.object({
  // ── Website identity ──────────────────────────────────────────────────────
  site_name: withSafeInput(
    z.string().trim().min(2, "Site name must be at least 2 characters").max(120),
  ),
  site_title: withSafeInput(
    z.string().trim().min(2, "Site title must be at least 2 characters").max(160),
  ),
  site_description: withSafeInput(
    z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters")
      .max(500),
  ),
  keywords: optionalSafe(500),

  // ── Social share (Open Graph & Twitter) ──────────────────────────────────
  og_title: optionalSafe(160),
  og_description: optionalSafe(500),
  twitter_title: optionalSafe(160),
  twitter_description: optionalSafe(500),
  twitter_handle: z
    .string()
    .trim()
    .max(80)
    .superRefine((val, ctx) => {
      if (!val) return;
      const reason = findUnsafeInputReason(val);
      if (reason) {
        ctx.addIssue({ code: "custom", message: reason });
        return;
      }
      if (!/^@?[A-Za-z0-9_]{1,50}$/.test(val)) {
        ctx.addIssue({ code: "custom", message: "Invalid Twitter/X handle" });
      }
    }),

  // ── Analytics ─────────────────────────────────────────────────────────────
  google_analytics_id: optionalTrackerId(
    /^G-[A-Z0-9]+$/i,
    "Google Analytics ID must look like G-XXXXXXXXXX",
    40,
  ),
  google_analytics_enabled: z.boolean(),
  google_tag_manager_id: optionalTrackerId(
    /^GTM-[A-Z0-9]+$/i,
    "GTM ID must look like GTM-XXXXXXX",
    40,
  ),
  google_tag_manager_enabled: z.boolean(),
  hotjar_site_id: optionalTrackerId(
    /^\d{5,10}$/,
    "Hotjar site ID must be 5–10 digits",
    40,
  ),
  hotjar_enabled: z.boolean(),
  plerdy_site_id: optionalTrackerId(
    /^[A-Za-z0-9_-]{4,80}$/,
    "Invalid Plerdy site ID",
    80,
  ),
  plerdy_enabled: z.boolean(),

  // ── Advertising pixels ────────────────────────────────────────────────────
  google_ads_id: optionalTrackerId(
    /^AW-\d+$/i,
    "Google Ads ID must look like AW-123456789",
    40,
  ),
  google_ads_enabled: z.boolean(),
  tiktok_pixel_id: optionalTrackerId(
    /^[A-Z0-9]{10,80}$/i,
    "Invalid TikTok pixel ID",
    80,
  ),
  tiktok_enabled: z.boolean(),
  linkedin_partner_id: optionalTrackerId(
    /^\d{5,12}$/,
    "LinkedIn partner ID must be numeric (5–12 digits)",
    40,
  ),
  linkedin_enabled: z.boolean(),
  twitter_pixel_id: optionalTrackerId(
    /^[A-Za-z0-9_]{5,80}$/,
    "Invalid Twitter/X pixel ID",
    80,
  ),
  twitter_pixel_enabled: z.boolean(),
  meta_pixel_id: optionalTrackerId(
    /^\d{5,20}$/,
    "Meta (Facebook) Pixel ID must be numeric",
    40,
  ),
  meta_pixel_enabled: z.boolean(),

  // ── Shop catalog ──────────────────────────────────────────────────────────
  shop_default_view: z.enum(["grid4", "grid3", "grid2", "list"]),
  shop_products_per_page: z.coerce.number().int().min(4).max(48),
});

export type SiteSettingsFormValues = z.infer<typeof siteSettingsFormSchema>;

export const SHOP_VIEW_OPTIONS = [
  { value: "grid4", label: "4 columns" },
  { value: "grid3", label: "3 columns" },
  { value: "grid2", label: "2 columns" },
  { value: "list", label: "List" },
] as const;

export const SHOP_PER_PAGE_OPTIONS = [8, 12, 16, 20, 24, 36, 48] as const;

/** API response shape for the dashboard GET/PATCH site-settings endpoints. */
export type SiteSettingsApiResponse = {
  settings: {
    site_name: string;
    site_title: string;
    site_description: string;
    keywords: string | null;
    og_title: string | null;
    og_description: string | null;
    og_image: { id: string; path: string; alt_text?: string | null } | null;
    twitter_title: string | null;
    twitter_description: string | null;
    twitter_handle: string | null;
    google_analytics_id: string | null;
    google_analytics_enabled: boolean;
    google_tag_manager_id: string | null;
    google_tag_manager_enabled: boolean;
    hotjar_site_id: string | null;
    hotjar_enabled: boolean;
    plerdy_site_id: string | null;
    plerdy_enabled: boolean;
    google_ads_id: string | null;
    google_ads_enabled: boolean;
    tiktok_pixel_id: string | null;
    tiktok_enabled: boolean;
    linkedin_partner_id: string | null;
    linkedin_enabled: boolean;
    twitter_pixel_id: string | null;
    twitter_pixel_enabled: boolean;
    meta_pixel_id: string | null;
    meta_pixel_enabled: boolean;
    shop_default_view: "grid4" | "grid3" | "grid2" | "list";
    shop_products_per_page: number;
    og_image_id: string | null;
  };
};

export function validateOgImageFile(file: File | null | undefined) {
  return validateSafeImageFile(file, OG_IMAGE_MAX_BYTES, "OG image");
}
