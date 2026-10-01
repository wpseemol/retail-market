import { z } from "zod";
import { withSafeInput } from "./customerAuth.js";

export const SEO_PAGE_KEYS = ["home", "shop", "stores", "brands"] as const;
export type SeoPageKey = (typeof SEO_PAGE_KEYS)[number];

/** Omitted → unchanged; empty string → cleared (`null`). */
const text = (max: number) =>
  z
    .union([withSafeInput(z.string().trim().max(max)), z.null()])
    .optional()
    .transform((v) => (v === undefined ? undefined : v ? v : null));

/** Google / Bing give either the bare token or a full `<meta>` tag; we keep only the token. */
const verification = z
  .union([z.string().trim().max(400), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (!v) return null;
    const fromTag = v.match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
    return (fromTag ?? v).trim();
  })
  .pipe(
    z
      .union([
        z.string().max(120).regex(/^[A-Za-z0-9_\-.:=+/]+$/, "Paste the verification code only"),
        z.null(),
      ])
      .optional(),
  );

const pageDefaults = z.object({
  title: text(70),
  description: text(170),
});

export const updateSeoSettingsSchema = z.object({
  site_title: withSafeInput(z.string().trim().min(2).max(160)).optional(),
  site_description: withSafeInput(z.string().trim().min(10).max(500)).optional(),
  keywords: text(500),
  seo_title_template: text(120).refine(
    (v) => v === undefined || v === null || v.includes("%s"),
    "Template must contain %s where the page title goes",
  ),
  og_title: text(160),
  og_description: text(300),
  twitter_title: text(160),
  twitter_description: text(300),
  twitter_handle: z
    .union([z.string().trim().regex(/^@?[A-Za-z0-9_]{1,15}$/, "Use a handle like @niyenin"), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === undefined ? undefined : v ? (v.startsWith("@") ? v : `@${v}`) : null)),
  google_site_verification: verification,
  bing_site_verification: verification,
  seo_noindex_site: z.boolean().optional(),
  seo_pages: z
    .object(
      Object.fromEntries(SEO_PAGE_KEYS.map((k) => [k, pageDefaults.optional()])) as Record<
        SeoPageKey,
        z.ZodOptional<typeof pageDefaults>
      >,
    )
    .optional(),
});

export type UpdateSeoSettingsInput = z.infer<typeof updateSeoSettingsSchema>;

export type SeoPages = Record<SeoPageKey, { title: string | null; description: string | null }>;

export function normalizeSeoPages(raw: unknown): SeoPages {
  const data = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out = {} as SeoPages;
  for (const key of SEO_PAGE_KEYS) {
    const page = data[key] && typeof data[key] === "object" ? (data[key] as Record<string, unknown>) : {};
    out[key] = {
      title: typeof page.title === "string" && page.title.trim() ? page.title : null,
      description: typeof page.description === "string" && page.description.trim() ? page.description : null,
    };
  }
  return out;
}
