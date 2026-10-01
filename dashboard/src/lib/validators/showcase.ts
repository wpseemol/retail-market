import { z } from "zod";
import {
  ANNOUNCEMENT_TONES,
  SHOWCASE_HERO_STYLES,
  SHOWCASE_SECTION_KEYS,
  SOCIAL_KEYS,
  SOCIAL_META,
  type ShowcasePayload,
  type SocialKey,
} from "@/lib/showcase";
import { validateSafeImageFile } from "./safeInput";
import { optionalText } from "./seo";

export const SHOWCASE_IMAGE_LIMITS = {
  og: 1 * 1024 * 1024,
  storeLogo: 5 * 1024 * 1024,
  storeBanner: 5 * 1024 * 1024,
  brandLogo: 1 * 1024 * 1024,
  brandBanner: 5 * 1024 * 1024,
} as const;

export type ShowcaseImageSlot = keyof typeof SHOWCASE_IMAGE_LIMITS;

export function validateShowcaseImageFile(file: File | null | undefined, slot: ShowcaseImageSlot, label: string) {
  return validateSafeImageFile(file, SHOWCASE_IMAGE_LIMITS[slot], label);
}

function socialUrl(key: SocialKey) {
  return optionalText(255).superRefine((value, ctx) => {
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
    const hosts = SOCIAL_META[key].hosts;
    const host = url.hostname.toLowerCase();
    if (hosts && !hosts.some((h) => host === h || host.endsWith(`.${h}`))) {
      ctx.addIssue({ code: "custom", message: `Use a ${hosts[0]} link` });
    }
  });
}

const announcementLink = optionalText(255).refine((value) => {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}, "Use a site path like /shop or an https:// URL");

export const showcaseFormSchema = z.object({
  tagline: optionalText(160),
  accent_color: z
    .string()
    .trim()
    .refine((v) => !v || /^#[0-9a-fA-F]{6}$/.test(v), "Use a hex colour like #16A34A"),
  seo_title: optionalText(70),
  seo_description: optionalText(170),
  seo_keywords: optionalText(255),
  noindex: z.boolean(),
  showcase: z.object({
    hero_style: z.enum(SHOWCASE_HERO_STYLES),
    sections: z.array(z.object({ key: z.enum(SHOWCASE_SECTION_KEYS), enabled: z.boolean() })),
    about: optionalText(5000),
    contact: z.object({
      phone: optionalText(40).refine((v) => !v || /^[+\d][\d\s\-()]{5,}$/.test(v), "Enter a valid phone number"),
      email: z
        .string()
        .trim()
        .max(160)
        .refine((v) => !v || z.email().safeParse(v).success, "Enter a valid email"),
      address: optionalText(300),
      hours: optionalText(160),
    }),
    social: z.object(
      Object.fromEntries(SOCIAL_KEYS.map((k) => [k, socialUrl(k)])) as Record<SocialKey, ReturnType<typeof socialUrl>>,
    ),
    policies: z.object({ shipping: optionalText(3000), returns: optionalText(3000) }),
    announcement: z
      .object({
        enabled: z.boolean(),
        text: optionalText(160),
        link: announcementLink,
        tone: z.enum(ANNOUNCEMENT_TONES),
      })
      .refine((a) => !a.enabled || Boolean(a.text), {
        message: "Add the announcement text, or turn the bar off",
        path: ["text"],
      }),
  }),
});

export type ShowcaseFormValues = z.infer<typeof showcaseFormSchema>;

export function toShowcaseFormValues(p: ShowcasePayload): ShowcaseFormValues {
  const s = p.showcase;
  return {
    tagline: p.tagline ?? "",
    accent_color: p.accent_color ?? "",
    seo_title: p.seo_title ?? "",
    seo_description: p.seo_description ?? "",
    seo_keywords: p.seo_keywords ?? "",
    noindex: p.noindex,
    showcase: {
      hero_style: s.hero_style,
      sections: s.sections.map((row) => ({ key: row.key, enabled: row.key === "products" ? true : row.enabled })),
      about: s.about ?? "",
      contact: {
        phone: s.contact.phone ?? "",
        email: s.contact.email ?? "",
        address: s.contact.address ?? "",
        hours: s.contact.hours ?? "",
      },
      social: Object.fromEntries(SOCIAL_KEYS.map((k) => [k, s.social[k] ?? ""])) as Record<SocialKey, string>,
      policies: { shipping: s.policies.shipping ?? "", returns: s.policies.returns ?? "" },
      announcement: {
        enabled: s.announcement.enabled,
        text: s.announcement.text ?? "",
        link: s.announcement.link ?? "",
        tone: s.announcement.tone,
      },
    },
  };
}

/** The API treats "" as "clear"; the full `showcase` object is always sent. */
export function toShowcaseApiBody(values: ShowcaseFormValues) {
  return {
    ...values,
    accent_color: values.accent_color ? values.accent_color.toUpperCase() : "",
  };
}
