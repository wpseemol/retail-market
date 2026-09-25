import { API_URL } from "@/lib/api";

export type HeroMedia = {
  path: string;
  alt_text?: string | null;
} | null;

export type HomeHeroBanner = {
  main: {
    eyebrow: string;
    headline: string;
    subtext: string | null;
    discount_percent: number | null;
    price_label: string | null;
    cta_label: string;
    cta_href: string;
    product_image: HeroMedia;
    bg_image: HeroMedia;
  };
  side: {
    badge_label: string | null;
    offer_percent: number | null;
    offer_label: string | null;
    headline: string;
    discount_percent: number | null;
    cta_label: string;
    cta_href: string;
    product_image: HeroMedia;
    bg_image: HeroMedia;
  };
  updated_at?: string;
};

/** Static fallbacks matching the original HeroBanner art. */
export const DEFAULT_HOME_HERO: HomeHeroBanner = {
  main: {
    eyebrow: "Widescreen 4k .......",
    headline: "DIGITAL SLR CAMERA HIGH DEFINITION",
    subtext: "Sumptuous, filling, and temptingly",
    discount_percent: 70,
    price_label: "$ 180.99",
    cta_label: "SHOP NOW",
    cta_href: "/shop",
    product_image: null,
    bg_image: null,
  },
  side: {
    badge_label: "New",
    offer_percent: 25,
    offer_label: "offer",
    headline: "CLOUD CAM, SECURITY CAMERA",
    discount_percent: 70,
    cta_label: "SHOP NOW",
    cta_href: "/shop",
    product_image: null,
    bg_image: null,
  },
};

/** Fetch home hero for SSR (cached ~60s). */
export async function getHeroBanner(): Promise<HomeHeroBanner> {
  try {
    const res = await fetch(`${API_URL}/api/home/hero`, {
      next: { revalidate: 60, tags: ["home-hero"] },
    });
    if (!res.ok) return DEFAULT_HOME_HERO;
    const data = (await res.json()) as { hero?: HomeHeroBanner };
    if (!data.hero?.main?.headline || !data.hero?.side?.headline) {
      return DEFAULT_HOME_HERO;
    }
    return data.hero;
  } catch {
    return DEFAULT_HOME_HERO;
  }
}
