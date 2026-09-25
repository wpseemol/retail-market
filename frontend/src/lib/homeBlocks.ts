import { API_URL } from "@/lib/api";
import {
  DEFAULT_HOME_HERO,
  type HomeHeroBanner,
} from "@/lib/homeHero";

export type HomeBlocksMap = Record<string, unknown>;

export type HomePagePayload = {
  blocks: HomeBlocksMap;
  hero: HomeHeroBanner;
};

const EMPTY_BLOCKS: HomeBlocksMap = {};

/** One SSR fetch for all home CMS blocks + hero (cached ~60s). */
export async function getHomePageContent(): Promise<HomePagePayload> {
  try {
    const res = await fetch(`${API_URL}/api/home/blocks`, {
      next: { revalidate: 60, tags: ["home-blocks", "home-hero"] },
    });
    if (!res.ok) {
      return { blocks: EMPTY_BLOCKS, hero: DEFAULT_HOME_HERO };
    }
    const data = (await res.json()) as {
      blocks?: HomeBlocksMap;
      hero?: HomeHeroBanner;
    };
    return {
      blocks: data.blocks && typeof data.blocks === "object" ? data.blocks : EMPTY_BLOCKS,
      hero: data.hero?.main?.headline ? data.hero : DEFAULT_HOME_HERO,
    };
  } catch {
    return { blocks: EMPTY_BLOCKS, hero: DEFAULT_HOME_HERO };
  }
}

export function getBlock<T extends Record<string, unknown>>(
  blocks: HomeBlocksMap,
  key: string,
  fallback: T,
): T {
  const raw = blocks[key];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fallback;
  return { ...fallback, ...(raw as T) };
}
