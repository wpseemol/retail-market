import { API_URL } from "@/lib/api";
import type { ShopProduct } from "@/components/shop/types";

export type ApiProductMedia = {
  id: string;
  path: string;
  alt_text?: string | null;
} | null;

export type ApiProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  stock_qty: number;
  short_description: string | null;
  description: string | null;
  is_featured: boolean;
  brand_name: string | null;
  brand_banned?: boolean;
  thumbnail: ApiProductMedia;
  gallery?: NonNullable<ApiProductMedia>[];
  category: { id: string; name: string; slug: string } | null;
  brand: {
    id: string | null;
    name: string;
    slug: string | null;
    is_active?: boolean;
  } | null;
  vendor: { id: string; shop_name: string; slug: string } | null;
};

export type ProductDetailPayload = {
  product: ApiProduct;
  related: ApiProduct[];
};

export type ShopFacet = { id: string; label: string; count: number };

export type ProductsListPayload = {
  products: ApiProduct[];
  facets: {
    categories: ShopFacet[];
    brands: ShopFacet[];
    price: { min: number; max: number };
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

export function toShopProduct(product: ApiProduct): ShopProduct {
  const thumb =
    product.thumbnail?.path ||
    product.gallery?.[0]?.path ||
    "/images/camera.png";
  const gallery = [
    ...(product.thumbnail?.path ? [product.thumbnail.path] : []),
    ...(product.gallery ?? [])
      .map((g) => g.path)
      .filter((p) => p && p !== product.thumbnail?.path),
  ];
  if (gallery.length === 0) gallery.push(thumb);

  const price = Number(product.price) || 0;
  const compare = product.compare_at_price
    ? Number(product.compare_at_price)
    : null;

  return {
    id: Number(product.id),
    slug: product.slug || String(product.id),
    name: product.name,
    image: thumb,
    alt: product.thumbnail?.alt_text || product.name,
    rating: 4,
    reviewCount: 0,
    priceMin: price,
    priceMax: compare && compare > price ? compare : price,
    available: product.stock_qty,
    isNew: product.is_featured,
    category: product.category?.slug || product.category?.name || "electronics",
    brand: product.brand?.slug || product.brand_name || "niyenin",
    colors: [],
    tags: [
      product.category?.name,
      product.brand_name || product.brand?.name,
      product.is_featured ? "featured" : null,
    ].filter(Boolean) as string[],
    sku: product.sku ?? undefined,
    model: product.brand_name || product.brand?.name || undefined,
    description:
      product.description || product.short_description || undefined,
    gallery,
    categoryLabels: [
      product.vendor?.shop_name,
      product.category?.name,
      product.brand_name || product.brand?.name,
    ].filter(Boolean) as string[],
  };
}

export async function fetchProducts(options?: {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  brand?: string;
  sort?: string;
}): Promise<ProductsListPayload> {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.q?.trim()) params.set("q", options.q.trim());
  if (options?.category) params.set("category", options.category);
  if (options?.brand) params.set("brand", options.brand);
  if (options?.sort) params.set("sort", options.sort);
  const qs = params.toString();
  const url = `${API_URL}/api/products${qs ? `?${qs}` : ""}`;

  const empty: ProductsListPayload = {
    products: [],
    facets: {
      categories: [],
      brands: [],
      price: { min: 0, max: 0 },
    },
    pagination: { page: 1, limit: 24, total: 0, total_pages: 1 },
  };

  try {
    const res = await fetch(url, {
      next: { revalidate: 60, tags: ["products"] },
    });
    if (!res.ok) return empty;
    return (await res.json()) as ProductsListPayload;
  } catch {
    return empty;
  }
}

export async function fetchProductByIdOrSlug(
  idOrSlug: string,
): Promise<ProductDetailPayload | null> {
  const url = `${API_URL}/api/products/${encodeURIComponent(idOrSlug)}`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 60, tags: [`product:${idOrSlug}`] },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as ProductDetailPayload;
  } catch {
    return null;
  }
}
