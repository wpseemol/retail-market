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

/** Client-side guard mirroring the API safe-input check. */
export function normalizeSearchQuery(raw: string): string | null {
  const q = raw.trim().slice(0, SEARCH_MAX_CHARS);
  if (q.length < SEARCH_MIN_CHARS) return null;
  if (UNSAFE_SEARCH_RE.test(q)) return null;
  return q;
}

export async function fetchSearchSuggestions(
  q: string,
  signal?: AbortSignal,
): Promise<SearchSuggestPayload> {
  const res = await fetch(
    `/api/backend/search/suggest?q=${encodeURIComponent(q)}`,
    { signal, headers: { Accept: "application/json" } },
  );
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? "Search failed");
  }
  return (await res.json()) as SearchSuggestPayload;
}
