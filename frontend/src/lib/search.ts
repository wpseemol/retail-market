export type SearchSuggestProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  thumbnail: string | null;
  category: string | null;
  shop: string | null;
};

export type SearchSuggestCategory = {
  id: string;
  name: string;
  slug: string;
  parent: string | null;
  products_count: number;
};

export type SearchSuggestShop = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  products_count: number;
};

export type SearchSuggestPayload = {
  q: string;
  products: SearchSuggestProduct[];
  product_total: number;
  categories: SearchSuggestCategory[];
  shops: SearchSuggestShop[];
};

export const SEARCH_MIN_CHARS = 2;
export const SEARCH_MAX_CHARS = 80;

const UNSAFE_SEARCH_RE =
  /<\s*\/?\s*[a-z!]|javascript\s*:|\bon[a-z]+\s*=|<\?|\bunion\s+select\b|\bdrop\s+table\b|\/\*|\*\/|--\s/i;

export type SearchQueryIssue = "short" | "unsafe";

/** Why a non-empty query cannot be sent. Empty input is the recent-search state. */
export function searchQueryIssue(raw: string): SearchQueryIssue | null {
  const q = raw.trim().slice(0, SEARCH_MAX_CHARS);
  if (!q) return null;
  if (q.length < SEARCH_MIN_CHARS) return "short";
  if (UNSAFE_SEARCH_RE.test(q)) return "unsafe";
  return null;
}

/** Client-side guard mirroring the API safe-input check. */
export function normalizeSearchQuery(raw: string): string | null {
  if (searchQueryIssue(raw)) return null;
  const q = raw.trim().slice(0, SEARCH_MAX_CHARS);
  if (q.length < SEARCH_MIN_CHARS) return null;
  return q;
}

const RECENT_SEARCHES_KEY = "rm_recent_searches";
const RECENT_PRODUCTS_KEY = "rm_recent_search_products";
const RECENT_LIMIT = 8;

export type RecentSearchProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  thumbnail: string | null;
};

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function readRecentSearches(): string[] {
  const rows = readJson<unknown>(RECENT_SEARCHES_KEY);
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((item): item is string => typeof item === "string")
    .map((item) => normalizeSearchQuery(item))
    .filter((item): item is string => Boolean(item))
    .slice(0, RECENT_LIMIT);
}

export function rememberSearch(raw: string): string[] {
  const q = normalizeSearchQuery(raw);
  if (!q || typeof window === "undefined") return readRecentSearches();
  const next = [q, ...readRecentSearches().filter((item) => item !== q)].slice(
    0,
    RECENT_LIMIT,
  );
  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  return next;
}

export function removeRecentSearch(raw: string): string[] {
  if (typeof window === "undefined") return [];
  const next = readRecentSearches().filter((item) => item !== raw);
  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  return next;
}

export function clearRecentSearches(): void {
  window.localStorage.removeItem(RECENT_SEARCHES_KEY);
}

export function readRecentProducts(): RecentSearchProduct[] {
  const rows = readJson<unknown>(RECENT_PRODUCTS_KEY);
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((item): item is RecentSearchProduct => {
      if (!item || typeof item !== "object") return false;
      const row = item as RecentSearchProduct;
      return (
        typeof row.id === "string" &&
        typeof row.name === "string" &&
        typeof row.slug === "string" &&
        typeof row.price === "number"
      );
    })
    .slice(0, RECENT_LIMIT);
}

export function rememberProduct(product: RecentSearchProduct): RecentSearchProduct[] {
  if (typeof window === "undefined") return readRecentProducts();
  const next = [
    product,
    ...readRecentProducts().filter((item) => item.id !== product.id),
  ].slice(0, RECENT_LIMIT);
  window.localStorage.setItem(RECENT_PRODUCTS_KEY, JSON.stringify(next));
  return next;
}

type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  thumbnail: { path?: string | null } | null;
  category: { name?: string | null } | null;
  vendor: { shop_name?: string | null } | null;
};

export type BrowseShelfProduct = SearchSuggestProduct & {
  categorySlug: string | null;
};

export type BrowseShelf = {
  products: BrowseShelfProduct[];
  keywords: string[];
  keywordsBySlug: Record<string, string[]>;
  covers: Record<string, string>;
};

const KEYWORD_SKIP =
  /^(the|and|with|for|from|new|pro|max|plus|mini|lite|inch|wireless|smart|hd|4k|gb|mp|lte|android|official|black|white)$/i;

function rememberKeyword(
  map: Map<string, { label: string; n: number }>,
  raw: string | null | undefined,
  weight: number,
) {
  const label = (raw ?? "").replace(/\s+/g, " ").trim();
  if (label.length < 2 || label.length > 32 || KEYWORD_SKIP.test(label)) return;
  if (searchQueryIssue(label)) return;
  const key = label.toLowerCase();
  const prev = map.get(key);
  if (prev) prev.n += weight;
  else map.set(key, { label, n: weight });
}

function topKeywords(
  map: Map<string, { label: string; n: number }>,
  limit = 10,
): string[] {
  return [...map.values()]
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map((item) => item.label);
}

function keywordsFromProducts(
  products: {
    name: string;
    brand?: string | null;
    category?: string | null;
  }[],
): string[] {
  const map = new Map<string, { label: string; n: number }>();
  for (const product of products) {
    rememberKeyword(map, product.brand, 3);
    rememberKeyword(map, product.category, 2);
    const words = product.name
      .split(/[^A-Za-z0-9]+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 3 && !KEYWORD_SKIP.test(word) && !/^\d+$/.test(word));
    if (words[0]) rememberKeyword(map, words[0], 2);
    if (words[1]) rememberKeyword(map, `${words[0]} ${words[1]}`, 1);
  }
  return topKeywords(map);
}

/** Popular keywords, product photos, and a cover image per category for the empty search panel. */
export async function fetchBrowseShelf(
  signal?: AbortSignal,
): Promise<BrowseShelf> {
  const res = await fetch("/api/backend/products?limit=48&sort=newest", {
    signal,
    headers: { Accept: "application/json" },
  });
  const empty: BrowseShelf = {
    products: [],
    keywords: [],
    keywordsBySlug: {},
    covers: {},
  };
  if (!res.ok) return empty;
  const data = (await res.json()) as {
    products?: {
      id: string;
      name: string;
      slug: string;
      price: number;
      thumbnail?: { path?: string | null } | null;
      category?: { name?: string | null; slug?: string | null } | null;
      brand_name?: string | null;
      vendor?: { shop_name?: string | null } | null;
    }[];
  };
  const products: BrowseShelfProduct[] = [];
  const covers: Record<string, string> = {};
  const keywordRows: { name: string; brand?: string | null; category?: string | null }[] = [];
  const bySlug = new Map<string, { name: string; brand?: string | null; category?: string | null }[]>();
  for (const product of data.products ?? []) {
    const slug = product.category?.slug ?? null;
    const thumb = product.thumbnail?.path ?? null;
    products.push({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      thumbnail: thumb,
      category: product.category?.name ?? null,
      shop: product.vendor?.shop_name ?? null,
      categorySlug: slug,
    });
    if (slug && thumb && !covers[slug]) covers[slug] = thumb;
    const keywordRow = {
      name: product.name,
      brand: product.brand_name,
      category: product.category?.name,
    };
    keywordRows.push(keywordRow);
    if (slug) {
      const bucket = bySlug.get(slug) ?? [];
      bucket.push(keywordRow);
      bySlug.set(slug, bucket);
    }
  }
  const keywordsBySlug: Record<string, string[]> = {};
  for (const [slug, rows] of bySlug) {
    keywordsBySlug[slug] = keywordsFromProducts(rows);
  }
  return {
    products,
    keywords: keywordsFromProducts(keywordRows),
    keywordsBySlug,
    covers,
  };
}

/** One product photo per category, used when the category itself has no image. */
export async function fetchCategoryCovers(
  signal?: AbortSignal,
): Promise<Record<string, string>> {
  const res = await fetch("/api/backend/products?limit=48&sort=newest", {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return {};
  const data = (await res.json()) as {
    products?: {
      category?: { slug?: string | null } | null;
      thumbnail?: { path?: string | null } | null;
    }[];
  };
  const covers: Record<string, string> = {};
  for (const product of data.products ?? []) {
    const slug = product.category?.slug;
    const path = product.thumbnail?.path;
    if (slug && path && !covers[slug]) covers[slug] = path;
  }
  return covers;
}

/** Featured/newest products for the empty search window. */
export async function fetchSuggestedProducts(
  signal?: AbortSignal,
): Promise<SearchSuggestProduct[]> {
  const res = await fetch("/api/backend/products?limit=8&sort=newest", {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { products?: CatalogProduct[] };
  return (data.products ?? []).map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    thumbnail: product.thumbnail?.path ?? null,
    category: product.category?.name ?? null,
    shop: product.vendor?.shop_name ?? null,
  }));
}

export async function fetchSearchSuggestions(
  q: string,
  signal?: AbortSignal,
): Promise<SearchSuggestPayload> {
  const res = await fetch(
    `/api/backend/search/suggest?q=${encodeURIComponent(q)}&limit=8`,
    { signal, headers: { Accept: "application/json" } },
  );
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? "Search failed");
  }
  return (await res.json()) as SearchSuggestPayload;
}
