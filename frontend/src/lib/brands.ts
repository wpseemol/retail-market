import { API_URL } from "@/lib/api";
import type { Locale } from "@/i18n/config";
import type { ShowcaseMedia, ShowcasePayload, StorefrontSort } from "@/lib/showcase";
import type { StorefrontProduct } from "@/lib/stores";

export type BrandListItem = {
  id: string;
  name: string;
  name_bn?: string | null;
  slug: string;
  description: string | null;
  description_bn?: string | null;
  tagline: string | null;
  image: ShowcaseMedia;
  products_count: number;
  updated_at: string;
};

export type BrandsListPayload = {
  brands: BrandListItem[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
};

export type BrandDetail = ShowcasePayload & {
  id: string;
  name: string;
  name_bn?: string | null;
  slug: string;
  description: string | null;
  description_bn?: string | null;
  image: ShowcaseMedia;
  banner: ShowcaseMedia;
  created_at: string;
  updated_at: string;
  store: { id: string; shop_name: string; slug: string; logo: ShowcaseMedia } | null;
  products_count: number;
};

export type BrandPagePayload = {
  brand: BrandDetail;
  products: StorefrontProduct[];
  featured_products: StorefrontProduct[];
  sort: StorefrontSort;
  pagination: { page: number; limit: number; total: number; total_pages: number };
};

/**
 * Display name / description for the shopper's language. Each Bangla field falls back to
 * its English one on its own, so a brand with only a Bangla name still shows the English description.
 */
export function brandText(
  brand: {
    name: string;
    name_bn?: string | null;
    description: string | null;
    description_bn?: string | null;
  },
  locale: Locale,
): { name: string; description: string | null } {
  if (locale !== "bn") return { name: brand.name, description: brand.description };
  return {
    name: brand.name_bn?.trim() || brand.name,
    description: brand.description_bn?.trim() || brand.description,
  };
}

const EMPTY_LIST: BrandsListPayload = {
  brands: [],
  pagination: { page: 1, limit: 60, total: 0, total_pages: 1 },
};

export async function fetchBrands(options?: { q?: string; limit?: number }): Promise<BrandsListPayload> {
  const params = new URLSearchParams();
  params.set("limit", String(options?.limit ?? 200));
  if (options?.q?.trim()) params.set("q", options.q.trim());

  try {
    const res = await fetch(`${API_URL}/api/brands?${params}`, {
      next: { revalidate: 60, tags: ["brands"] },
    });
    if (!res.ok) return EMPTY_LIST;
    return (await res.json()) as BrandsListPayload;
  } catch {
    return EMPTY_LIST;
  }
}

export async function fetchBrandBySlug(
  slug: string,
  options?: { page?: number; limit?: number; sort?: StorefrontSort },
): Promise<BrandPagePayload | null> {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.sort) params.set("sort", options.sort);
  const qs = params.toString();

  try {
    const res = await fetch(`${API_URL}/api/brands/${encodeURIComponent(slug)}${qs ? `?${qs}` : ""}`, {
      next: { revalidate: 60, tags: ["brands", `brand:${slug}`] },
    });
    if (!res.ok) return null;
    return (await res.json()) as BrandPagePayload;
  } catch {
    return null;
  }
}
