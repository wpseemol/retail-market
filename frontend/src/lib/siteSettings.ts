import { API_URL } from "@/lib/api";
import { siteConfig } from "@/config/site";

export type TrackerConfig = {
  enabled: boolean;
  id: string | null;
};

export type PublicSiteSettings = {
  site_name: string;
  site_title: string;
  site_description: string;
  keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: { path: string } | null;
  twitter_title: string | null;
  twitter_description: string | null;
  twitter_handle: string | null;
  shop: {
    default_view: "grid4" | "grid3" | "grid2" | "list";
    products_per_page: number;
  };
  analytics: {
    google_analytics: TrackerConfig;
    google_tag_manager: TrackerConfig;
    hotjar: TrackerConfig;
    plerdy: TrackerConfig;
  };
  pixels: {
    google_ads: TrackerConfig;
    tiktok: TrackerConfig;
    linkedin: TrackerConfig;
    twitter: TrackerConfig;
    meta: TrackerConfig;
  };
};

const FALLBACK: PublicSiteSettings = {
  site_name: siteConfig.name,
  site_title: siteConfig.title,
  site_description: siteConfig.description,
  keywords: siteConfig.keywords.join(", "),
  og_title: null,
  og_description: null,
  og_image: null,
  twitter_title: null,
  twitter_description: null,
  twitter_handle: siteConfig.social.twitter,
  shop: {
    default_view: "grid4",
    products_per_page: 12,
  },
  analytics: {
    google_analytics: { enabled: false, id: null },
    google_tag_manager: { enabled: false, id: null },
    hotjar: { enabled: false, id: null },
    plerdy: { enabled: false, id: null },
  },
  pixels: {
    google_ads: { enabled: false, id: null },
    tiktok: { enabled: false, id: null },
    linkedin: { enabled: false, id: null },
    twitter: { enabled: false, id: null },
    meta: { enabled: false, id: null },
  },
};

const SHOP_VIEWS = ["grid4", "grid3", "grid2", "list"] as const;

function normalizeShopSettings(
  shop: PublicSiteSettings["shop"] | undefined,
): PublicSiteSettings["shop"] {
  const view = shop?.default_view;
  const perPage = shop?.products_per_page;
  return {
    default_view: SHOP_VIEWS.includes(view as (typeof SHOP_VIEWS)[number])
      ? (view as PublicSiteSettings["shop"]["default_view"])
      : "grid4",
    products_per_page:
      typeof perPage === "number" && perPage >= 4 && perPage <= 48
        ? perPage
        : 12,
  };
}

/** Fetch live site settings from the API (cached ~60s). Falls back to static config. */
export async function getSiteSettings(): Promise<PublicSiteSettings> {
  try {
    const res = await fetch(`${API_URL}/api/site-settings`, {
      next: { revalidate: 60, tags: ["site-settings"] },
    });
    if (!res.ok) return FALLBACK;
    const data = (await res.json()) as { settings?: PublicSiteSettings };
    if (!data.settings) return FALLBACK;
    return {
      ...data.settings,
      shop: normalizeShopSettings(data.settings.shop),
    };
  } catch {
    return FALLBACK;
  }
}
