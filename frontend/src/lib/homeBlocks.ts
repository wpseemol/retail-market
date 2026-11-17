import { appKeyHeaders, publicApiUrl } from "@/lib/api";
import {
  DEFAULT_HOME_HERO,
  type HomeHeroBanner,
} from "@/lib/homeHero";
import { withCatalogCache } from "@/lib/rxdb/withCache";

export type HomeBlocksMap = Record<string, unknown>;

export type HomePagePayload = {
  blocks: HomeBlocksMap;
  hero: HomeHeroBanner;
};

const EMPTY_BLOCKS: HomeBlocksMap = {};

/** One SSR fetch for all home CMS blocks + hero (API + browser RxDB). */
export async function getHomePageContent(): Promise<HomePagePayload> {
  return withCatalogCache("home:blocks", async () => {
    try {
      const res = await fetch(publicApiUrl("/api/home/blocks"), {
        headers: appKeyHeaders(),
        next: { revalidate: 60, tags: ["home-blocks", "home-hero"] },
      });
      if (!res.ok) {
        if (typeof window === "undefined") {
          return { blocks: EMPTY_BLOCKS, hero: DEFAULT_HOME_HERO };
        }
        throw new Error(`Home blocks failed (${res.status})`);
      }
      const data = (await res.json()) as {
        blocks?: HomeBlocksMap;
        hero?: HomeHeroBanner;
      };
      return {
        blocks:
          data.blocks && typeof data.blocks === "object"
            ? data.blocks
            : EMPTY_BLOCKS,
        hero: data.hero?.main?.headline ? data.hero : DEFAULT_HOME_HERO,
      };
    } catch (err) {
      if (typeof window === "undefined") {
        return { blocks: EMPTY_BLOCKS, hero: DEFAULT_HOME_HERO };
      }
      throw err;
    }
  });
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
