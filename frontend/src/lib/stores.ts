import { API_URL } from "@/lib/api";

export type StoreMedia = {
  id: string;
  path: string;
  file_name?: string;
  alt_text?: string | null;
} | null;

export type StorefrontTheme = "classic" | "marketplace" | "showcase";

export type StorefrontStore = {
  id: string;
  shop_name: string;
  slug: string;
  description: string | null;
  logo: StoreMedia;
  banner?: StoreMedia;
  storefront_theme?: StorefrontTheme;
  products_per_page?: number;
  featured_products_count?: number;
  show_banned_brands?: boolean;
  product_sort?: string;
  products_count?: number;
};

export type StorefrontProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  short_description: string | null;
  is_featured: boolean;
  brand_name: string | null;
  brand_banned?: boolean;
  thumbnail: StoreMedia;
  category: { id: string; name: string; slug: string } | null;
  brand: {
    id: string | null;
    name: string;
    slug: string | null;
    is_active?: boolean;
  } | null;
};

export type StorePagePayload = {
  store: StorefrontStore;
  products: StorefrontProduct[];
  featured_products?: StorefrontProduct[];
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
  const params = new URLSearchParams();
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.q?.trim()) params.set("q", options.q.trim());
  const qs = params.toString();
  const url = `${API_URL}/api/shops${qs ? `?${qs}` : ""}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 60, tags: ["stores"] },
    });
    if (!res.ok) {
      return {
        stores: [],
        pagination: { page: 1, limit: 24, total: 0, total_pages: 1 },
      };
    }
    return (await res.json()) as StoresListPayload;
  } catch {
    return {
      stores: [],
      pagination: { page: 1, limit: 24, total: 0, total_pages: 1 },
    };
  }
}

export async function fetchStoreBySlug(
  slug: string,
  options?: { page?: number; limit?: number },
): Promise<StorePagePayload | null> {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));
  const qs = params.toString();
  const url = `${API_URL}/api/shops/${encodeURIComponent(slug)}${qs ? `?${qs}` : ""}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 60, tags: [`store:${slug}`] },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as StorePagePayload;
  } catch {
    return null;
  }
}
