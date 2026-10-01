export const STOREFRONT_URL =
  (import.meta.env.VITE_STOREFRONT_URL as string | undefined)?.replace(/\/$/, "") ?? "http://localhost:3000";

export const SEO_PAGE_KEYS = ["home", "shop", "stores", "brands"] as const;
export type SeoPageKey = (typeof SEO_PAGE_KEYS)[number];

export const SEO_PAGE_META: Record<SeoPageKey, { label: string; path: string; hint: string }> = {
  home: { label: "Home", path: "/", hint: "Falls back to the site title and meta description." },
  shop: { label: "Shop", path: "/shop", hint: "The full catalog with filters." },
  stores: { label: "Stores", path: "/stores", hint: "Directory of every active store." },
  brands: { label: "Brands", path: "/brands", hint: "A–Z directory of brands." },
};

export type SeoMedia = { id: string; path: string; alt_text?: string | null } | null;

/** `GET/PATCH /api/dashboard/seo` → `seo`. */
export type SeoSettings = {
  site_name: string;
  site_title: string;
  site_description: string;
  keywords: string | null;
  seo_title_template: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: SeoMedia;
  favicon: SeoMedia;
  twitter_title: string | null;
  twitter_description: string | null;
  twitter_handle: string | null;
  google_site_verification: string | null;
  bing_site_verification: string | null;
  seo_noindex_site: boolean;
  seo_pages: Record<SeoPageKey, { title: string | null; description: string | null }>;
  updated_at: string;
};

/** Google truncates around 600px; these are the usual safe character budgets. */
export const SEO_LIMITS = {
  title: { ideal: 60, max: 70 },
  description: { ideal: 155, max: 170 },
} as const;

export function applyTitleTemplate(title: string, template: string | null | undefined, siteName: string) {
  const tpl = template?.includes("%s") ? template : `%s | ${siteName}`;
  return tpl.replace("%s", title);
}
