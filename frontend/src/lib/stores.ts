import { appKeyHeaders, publicApiUrl } from "@/lib/api";
import type { Locale } from "@/i18n/config";
import {
  hashQuery,
  queryCacheId,
  withCatalogCache,
} from "@/lib/rxdb/withCache";
import type { ShowcaseMedia, ShowcasePayload, StorefrontSort } from "@/lib/showcase";

export type StoreMedia = ShowcaseMedia;

export type StorefrontTheme = "classic" | "marketplace" | "showcase";

export type StorefrontStore = {
  id: string;
  shop_name: string;
  shop_name_bn?: string | null;
  slug: string;
  description: string | null;
  description_bn?: string | null;
  /** Public search tags — never owner identity. */
  search_tags?: string | null;
  tagline?: string | null;
  accent_color?: string | null;
  logo: StoreMedia;
  banner?: StoreMedia;
  storefront_theme?: StorefrontTheme;
  products_per_page?: number;
  featured_products_count?: number;
  show_banned_brands?: boolean;
  product_sort?: string;
  products_count?: number;
  created_at?: string;
  updated_at?: string;
};

/** `GET /api/shops/:slug` store: profile + page design + linked brands. */
export type StoreDetail = StorefrontStore &
  ShowcasePayload & {
    brands: { id: string; name: string; name_bn?: string | null; slug: string; image: StoreMedia }[];
  };

/** Display name / description for the shopper's language; each Bangla field falls back to English on its own. */
export function storeText(
  store: {
    shop_name: string;
    shop_name_bn?: string | null;
    description: string | null;
    description_bn?: string | null;
  },
  locale: Locale,
): { name: string; description: string | null } {
  if (locale !== "bn") return { name: store.shop_name, description: store.description };
  return {
    name: store.shop_name_bn?.trim() || store.shop_name,
    description: store.description_bn?.trim() || store.description,
  };
}

export type StorefrontProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  short_description: string | null;
  name_bn?: string | null;
  short_description_bn?: string | null;
  is_featured: boolean;
  brand_name: string | null;
  brand_banned?: boolean;
  thumbnail: StoreMedia;
  category: { id: string; name: string; name_bn?: string | null; slug: string } | null;
  brand: {
    id: string | null;
    name: string;
    name_bn?: string | null;
    slug: string | null;
    is_active?: boolean;
  } | null;
};

export type StorePagePayload = {
  store: StoreDetail;
  products: StorefrontProduct[];
  featured_products?: StorefrontProduct[];
  sort?: StorefrontSort;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

export type StoresListPayload = {
  stores: StorefrontStore[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

export async function fetchStores(options?: {
  page?: number;
  limit?: number;
  q?: string;
}): Promise<StoresListPayload> {
  const empty: StoresListPayload = {
    stores: [],
    pagination: { page: 1, limit: 24, total: 0, total_pages: 1 },
  };
  const cacheId = queryCacheId(
    "shops:list",
    hashQuery({
      page: options?.page,
      limit: options?.limit,
      q: options?.q,
    }),
  );

  return withCatalogCache(cacheId, async () => {
    const params = new URLSearchParams();
    if (options?.page) params.set("page", String(options.page));
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.q?.trim()) params.set("q", options.q.trim());
    const qs = params.toString();
    const url = publicApiUrl(`/api/shops${qs ? `?${qs}` : ""}`);

    try {
      const res = await fetch(url, {
        headers: appKeyHeaders(),
        next: { revalidate: 60, tags: ["stores"] },
      });
      if (!res.ok) {
        if (typeof window === "undefined") return empty;
        throw new Error(`Shops list failed (${res.status})`);
      }
      return (await res.json()) as StoresListPayload;
    } catch (err) {
      if (typeof window === "undefined") return empty;
      throw err;
    }
  });
}

export async function fetchStoreBySlug(
  slug: string,
  options?: { page?: number; limit?: number; sort?: StorefrontSort },
): Promise<StorePagePayload | null> {
  const cacheId = queryCacheId(
    "shops:detail",
    hashQuery({
      slug,
      page: options?.page,
      limit: options?.limit,
      sort: options?.sort,
    }),
  );

  return withCatalogCache(cacheId, async () => {
    const params = new URLSearchParams();
    if (options?.page) params.set("page", String(options.page));
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.sort) params.set("sort", options.sort);
    const qs = params.toString();
    const url = publicApiUrl(
      `/api/shops/${encodeURIComponent(slug)}${qs ? `?${qs}` : ""}`,
    );

    try {
      const res = await fetch(url, {
        headers: appKeyHeaders(),
        next: { revalidate: 60, tags: ["stores", `store:${slug}`] },
      });
      if (res.status === 404) return null;
      if (!res.ok) {
        if (typeof window === "undefined") return null;
        throw new Error(`Shop detail failed (${res.status})`);
      }
      return (await res.json()) as StorePagePayload;
    } catch (err) {
      if (typeof window === "undefined") return null;
      throw err;
    }
  });
}
