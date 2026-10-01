import { z } from "zod";
import { withSafeInput } from "./customerAuth.js";

export const SHOWCASE_SECTION_KEYS = [
  "featured",
  "products",
  "about",
  "reviews",
  "contact",
  "policies",
] as const;
export type ShowcaseSectionKey = (typeof SHOWCASE_SECTION_KEYS)[number];

export const SHOWCASE_HERO_STYLES = ["banner", "split", "minimal"] as const;
export const ANNOUNCEMENT_TONES = ["brand", "info", "success", "warning"] as const;

export const SOCIAL_KEYS = [
  "facebook",
  "instagram",
  "youtube",
  "tiktok",
  "x",
  "website",
] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];

/** Hosts each social link may point at (subdomains allowed). `website` accepts any https host. */
const SOCIAL_HOSTS: Record<Exclude<SocialKey, "website">, string[]> = {
  facebook: ["facebook.com", "fb.com", "fb.me"],
  instagram: ["instagram.com"],
  youtube: ["youtube.com", "youtu.be"],
  tiktok: ["tiktok.com"],
  x: ["x.com", "twitter.com"],
};

function hostMatches(host: string, allowed: string[]) {
  const h = host.toLowerCase();
  return allowed.some((a) => h === a || h.endsWith(`.${a}`));
}

/** Omitted → `undefined` (unchanged on PATCH); empty string → `null` (cleared). */
const text = (max: number) =>
  z
    .union([withSafeInput(z.string().trim().max(max)), z.null()])
    .optional()
    .transform((v) => (v === undefined ? undefined : v ? v : null));

function socialUrl(key: SocialKey) {
  return z
    .union([withSafeInput(z.string().trim().max(255)), z.null()])
    .optional()
    .transform((v) => (v ? v : null))
    .superRefine((value, ctx) => {
      if (!value) return;
      let url: URL;
      try {
        url = new URL(value);
      } catch {
        ctx.addIssue({ code: "custom", message: "Enter a full URL starting with https://" });
        return;
      }
      if (url.protocol !== "https:") {
        ctx.addIssue({ code: "custom", message: "Links must use https://" });
        return;
      }
      if (key !== "website" && !hostMatches(url.hostname, SOCIAL_HOSTS[key])) {
        ctx.addIssue({
          code: "custom",
          message: `Use a ${SOCIAL_HOSTS[key][0]} link`,
        });
      }
    });
}

/** Internal path (`/shop?…`) or an https URL. */
const announcementLink = z
  .union([withSafeInput(z.string().trim().max(255)), z.null()])
  .optional()
  .transform((v) => (v ? v : null))
  .superRefine((value, ctx) => {
    if (!value) return;
    if (value.startsWith("/") && !value.startsWith("//")) return;
    try {
      if (new URL(value).protocol === "https:") return;
    } catch {
      /* fall through */
    }
    ctx.addIssue({
      code: "custom",
      message: "Link must be a site path like /shop or an https:// URL",
    });
  });

export const showcaseContentSchema = z.object({
  hero_style: z.enum(SHOWCASE_HERO_STYLES).optional().default("banner"),
  sections: z
    .array(
      z.object({
        key: z.enum(SHOWCASE_SECTION_KEYS),
        enabled: z.boolean(),
      }),
    )
    .max(SHOWCASE_SECTION_KEYS.length)
    .optional()
    .default([])
    .refine(
      (rows) => new Set(rows.map((r) => r.key)).size === rows.length,
      "Each section can appear only once",
    ),
  about: text(5000),
  contact: z
    .object({
      phone: text(40),
      email: z
        .union([z.email().max(160), z.literal(""), z.null()])
        .optional()
        .transform((v) => (v ? v : null)),
      address: text(300),
      hours: text(160),
    })
    .optional()
    .default({ phone: null, email: null, address: null, hours: null }),
  social: z
    .object(
      Object.fromEntries(SOCIAL_KEYS.map((k) => [k, socialUrl(k)])) as Record<
        SocialKey,
        ReturnType<typeof socialUrl>
      >,
    )
    .optional()
    .default(
      Object.fromEntries(SOCIAL_KEYS.map((k) => [k, null])) as Record<SocialKey, null>,
    ),
  policies: z
    .object({ shipping: text(3000), returns: text(3000) })
    .optional()
    .default({ shipping: null, returns: null }),
  announcement: z
    .object({
      enabled: z.boolean().optional().default(false),
      text: text(160),
      link: announcementLink,
      tone: z.enum(ANNOUNCEMENT_TONES).optional().default("brand"),
    })
    .optional()
    .default({ enabled: false, text: null, link: null, tone: "brand" })
    .refine((a) => !a.enabled || Boolean(a.text), {
      message: "Announcement text is required when the bar is on",
      path: ["text"],
    }),
});

export type ShowcaseContent = z.infer<typeof showcaseContentSchema>;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** Body for `PATCH …/showcase` on stores and brands. Omitted keys stay unchanged. */
export const updateShowcaseSchema = z.object({
  tagline: text(160),
  accent_color: z
    .union([z.string().trim().regex(HEX_RE, "Use a hex colour like #16A34A"), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === undefined ? undefined : v ? v.toUpperCase() : null)),
  seo_title: text(70),
  seo_description: text(170),
  seo_keywords: text(255),
  noindex: z.boolean().optional(),
  showcase: showcaseContentSchema.optional(),
});

export type UpdateShowcaseInput = z.infer<typeof updateShowcaseSchema>;

export const brandOwnerSchema = z.object({
  vendor_id: z.union([z.string().regex(/^\d+$/, "Invalid store id"), z.null()]),
});
