import { z } from "zod";
import { SEO_PAGE_KEYS, type SeoPageKey, type SeoSettings } from "@/lib/seo";
import { findUnsafeInputReason, validateSafeImageFile, withSafeInput } from "./safeInput";

export const SEO_OG_IMAGE_MAX_BYTES = 1 * 1024 * 1024;

/** Optional string: safe-input guarded, empty allowed. */
export function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters`)
    .superRefine((val, ctx) => {
      if (!val) return;
      const reason = findUnsafeInputReason(val);
      if (reason) ctx.addIssue({ code: "custom", message: reason });
    });
}

/** Accepts the bare token or the full `<meta … content="…">` tag Google / Bing hand out. */
export function extractVerificationToken(value: string) {
  const fromTag = value.match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
  return (fromTag ?? value).trim();
}

const verification = z
  .string()
  .trim()
  .max(400)
  .superRefine((val, ctx) => {
    if (!val) return;
    const token = extractVerificationToken(val);
    if (token.length > 120 || !/^[A-Za-z0-9_\-.:=+/]+$/.test(token)) {
      ctx.addIssue({ code: "custom", message: "Paste the verification code (or the full meta tag) only" });
    }
  });

const pageDefaults = z.object({
  title: optionalText(70),
  description: optionalText(170),
});

export const seoSettingsSchema = z.object({
  site_title: withSafeInput(z.string().trim().min(2, "Site title must be at least 2 characters").max(160)),
  site_description: withSafeInput(
    z.string().trim().min(10, "Meta description must be at least 10 characters").max(500),
  ),
  keywords: optionalText(500),
  seo_title_template: optionalText(120).refine(
    (v) => !v || v.includes("%s"),
    "Include %s where the page title goes, e.g. %s | Niyenin",
  ),
  og_title: optionalText(160),
  og_description: optionalText(300),
  twitter_title: optionalText(160),
  twitter_description: optionalText(300),
  twitter_handle: z
    .string()
    .trim()
    .refine((v) => !v || /^@?[A-Za-z0-9_]{1,15}$/.test(v), "Use a handle like @niyenin"),
  google_site_verification: verification,
  bing_site_verification: verification,
  seo_noindex_site: z.boolean(),
  seo_pages: z.object(
    Object.fromEntries(SEO_PAGE_KEYS.map((k) => [k, pageDefaults])) as Record<SeoPageKey, typeof pageDefaults>,
  ),
});

export type SeoSettingsFormValues = z.infer<typeof seoSettingsSchema>;

export function toSeoFormValues(s: SeoSettings): SeoSettingsFormValues {
  return {
    site_title: s.site_title,
    site_description: s.site_description,
    keywords: s.keywords ?? "",
    seo_title_template: s.seo_title_template ?? "",
    og_title: s.og_title ?? "",
    og_description: s.og_description ?? "",
    twitter_title: s.twitter_title ?? "",
    twitter_description: s.twitter_description ?? "",
    twitter_handle: s.twitter_handle ?? "",
    google_site_verification: s.google_site_verification ?? "",
    bing_site_verification: s.bing_site_verification ?? "",
    seo_noindex_site: s.seo_noindex_site,
    seo_pages: Object.fromEntries(
      SEO_PAGE_KEYS.map((k) => [k, { title: s.seo_pages[k]?.title ?? "", description: s.seo_pages[k]?.description ?? "" }]),
    ) as SeoSettingsFormValues["seo_pages"],
  };
}

export function toSeoApiBody(values: SeoSettingsFormValues) {
  return {
    ...values,
    google_site_verification: values.google_site_verification
      ? extractVerificationToken(values.google_site_verification)
      : "",
    bing_site_verification: values.bing_site_verification
      ? extractVerificationToken(values.bing_site_verification)
      : "",
  };
}

export function validateSeoOgImageFile(file: File | null | undefined) {
  return validateSafeImageFile(file, SEO_OG_IMAGE_MAX_BYTES, "Share image");
}
