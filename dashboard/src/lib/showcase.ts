/** Store / brand page design — mirrors `backend-api/src/validators/showcase.ts`. */

export const SHOWCASE_SECTION_KEYS = ["featured", "products", "about", "reviews", "contact", "policies"] as const;
export type ShowcaseSectionKey = (typeof SHOWCASE_SECTION_KEYS)[number];

export const SHOWCASE_SECTION_META: Record<ShowcaseSectionKey, { label: string; hint: string; locked?: boolean }> = {
  featured: { label: "Featured products", hint: "Up to 4 products marked as featured." },
  products: { label: "All products", hint: "Sortable, paginated grid. Always shown.", locked: true },
  about: { label: "About", hint: "Your story from the About tab." },
  reviews: { label: "Customer reviews", hint: "Latest approved reviews across your products." },
  contact: { label: "Contact & social", hint: "Phone, email, address, hours and social links." },
  policies: { label: "Policies", hint: "Shipping and returns text." },
};

export const SHOWCASE_HERO_STYLES = ["banner", "split", "minimal"] as const;
export type ShowcaseHeroStyle = (typeof SHOWCASE_HERO_STYLES)[number];

export const HERO_STYLE_META: Record<ShowcaseHeroStyle, { label: string; hint: string }> = {
  banner: { label: "Banner", hint: "Full-width banner image with your logo and name on top." },
  split: { label: "Split", hint: "Text on the left, banner image on the right." },
  minimal: { label: "Minimal", hint: "Compact header with an accent stripe, no banner." },
};

export const ANNOUNCEMENT_TONES = ["brand", "info", "success", "warning"] as const;
export type AnnouncementTone = (typeof ANNOUNCEMENT_TONES)[number];

export const SOCIAL_KEYS = ["facebook", "instagram", "youtube", "tiktok", "x", "website"] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];

export const SOCIAL_META: Record<SocialKey, { label: string; placeholder: string; hosts?: string[] }> = {
  facebook: { label: "Facebook", placeholder: "https://facebook.com/yourpage", hosts: ["facebook.com", "fb.com", "fb.me"] },
  instagram: { label: "Instagram", placeholder: "https://instagram.com/yourhandle", hosts: ["instagram.com"] },
  youtube: { label: "YouTube", placeholder: "https://youtube.com/@yourchannel", hosts: ["youtube.com", "youtu.be"] },
  tiktok: { label: "TikTok", placeholder: "https://tiktok.com/@yourhandle", hosts: ["tiktok.com"] },
  x: { label: "X (Twitter)", placeholder: "https://x.com/yourhandle", hosts: ["x.com", "twitter.com"] },
  website: { label: "Website", placeholder: "https://example.com" },
};

export type ShowcaseMedia = { id: string; path: string; alt_text?: string | null } | null;

export type ShowcaseContent = {
  hero_style: ShowcaseHeroStyle;
  sections: { key: ShowcaseSectionKey; enabled: boolean }[];
  about: string | null;
  contact: { phone: string | null; email: string | null; address: string | null; hours: string | null };
  social: Record<SocialKey, string | null>;
  policies: { shipping: string | null; returns: string | null };
  announcement: { enabled: boolean; text: string | null; link: string | null; tone: AnnouncementTone };
};

/** `GET …/showcase` on `/api/dashboard/shops/:slug` and `/api/dashboard/brands/:id`. */
export type ShowcasePayload = {
  id: string;
  slug: string;
  /** Stores. */
  shop_name?: string;
  owned_by_actor?: boolean;
  logo?: ShowcaseMedia;
  /** Brands. */
  name?: string;
  image?: ShowcaseMedia;
  banner: ShowcaseMedia;
  tagline: string | null;
  accent_color: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  noindex: boolean;
  og_image: ShowcaseMedia;
  showcase: ShowcaseContent;
};

const HEX_RE = /^#[0-9a-f]{6}$/i;

/** WCAG contrast ratio between two hex colours (1–21). */
export function contrastRatio(a: string, b: string) {
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => {
      const v = parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  if (!HEX_RE.test(a) || !HEX_RE.test(b)) return 21;
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Text colour the storefront puts on the accent (matches `readableTextOn` there). */
export function textOnAccent(hex: string): "#111111" | "#FFFFFF" {
  return contrastRatio(hex, "#111111") >= contrastRatio(hex, "#FFFFFF") ? "#111111" : "#FFFFFF";
}

export function isHexColor(value: string) {
  return HEX_RE.test(value);
}

export const ACCENT_SWATCHES = ["#00B207", "#2563EB", "#7C3AED", "#DB2777", "#EA580C", "#0F766E", "#B91C1C", "#111827"];
