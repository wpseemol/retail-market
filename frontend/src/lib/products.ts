import { API_URL, apiFetch } from "@/lib/api";
import type { ShopProduct } from "@/components/shop/types";
import type { Locale } from "@/i18n/config";

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
  /** null = site default shipping fee; 0 = free. */
  shipping_fee?: number | null;
  stock_qty: number;
  short_description: string | null;
  description: string | null;
  name_bn?: string | null;
  short_description_bn?: string | null;
  description_bn?: string | null;
  is_featured: boolean;
  brand_name: string | null;
  brand_banned?: boolean;
  thumbnail: ApiProductMedia;
  gallery?: NonNullable<ApiProductMedia>[];
  category: { id: string; name: string; name_bn?: string | null; slug: string } | null;
  brand: {
    id: string | null;
    name: string;
    name_bn?: string | null;
    slug: string | null;
    is_active?: boolean;
  } | null;
  vendor: { id: string; shop_name: string; shop_name_bn?: string | null; slug: string } | null;
};

type LocalizableProduct = {
  name: string;
  name_bn?: string | null;
  short_description: string | null;
  short_description_bn?: string | null;
  description?: string | null;
  description_bn?: string | null;
  brand_name: string | null;
  category: { name: string; name_bn?: string | null } | null;
  brand: { name: string; name_bn?: string | null } | null;
  vendor?: { shop_name: string; shop_name_bn?: string | null } | null;
};

/** TipTap HTML has visible text (an empty editor still yields `<p></p>`). */
function hasRichText(html: string | null | undefined): html is string {
  return Boolean(html && html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim());
}

/**
 * Copy of the product with Bangla text swapped in for `bn` shoppers. Each field (name, short
 * description, description, category / brand / store name) falls back to English on its own.
 * Keep SEO metadata and JSON-LD on the original English product.
 */
export function localizeProduct<P extends LocalizableProduct>(product: P, locale: Locale): P {
  if (locale !== "bn") return product;
  const pick = (bn: string | null | undefined, en: string) => bn?.trim() || en;
  const brandBn = product.brand?.name_bn?.trim();
  return {
    ...product,
    name: pick(product.name_bn, product.name),
    short_description: product.short_description_bn?.trim() || product.short_description,
    ...(product.description !== undefined
      ? {
          description: hasRichText(product.description_bn)
            ? product.description_bn
            : product.description,
        }
      : {}),
    brand_name: brandBn || product.brand_name,
    category: product.category
      ? { ...product.category, name: pick(product.category.name_bn, product.category.name) }
      : product.category,
    brand: product.brand ? { ...product.brand, name: brandBn || product.brand.name } : product.brand,
    ...(product.vendor
      ? {
          vendor: {
            ...product.vendor,
            shop_name: pick(product.vendor.shop_name_bn, product.vendor.shop_name),
          },
        }
      : {}),
  };
}

export type ProductDetailPayload = {
  product: ApiProduct;
  related: ApiProduct[];
};

export type ShopFacet = {
  id: string;
  label: string;
  /** Optional Bangla label (categories and brands). */
  label_bn?: string | null;
  count: number;
};

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

export function toShopProduct(apiProduct: ApiProduct, locale: Locale = "en"): ShopProduct {
  const product = localizeProduct(apiProduct, locale);
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

export type ProductListQuery = {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  brand?: string;
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
};

export function productListPath(options?: ProductListQuery) {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.q?.trim()) params.set("q", options.q.trim());
  if (options?.category) params.set("category", options.category);
  if (options?.brands && options.brands.length > 0) {
    params.set("brands", options.brands.join(","));
  } else if (options?.brand) {
    params.set("brand", options.brand);
  }
  if (options?.minPrice != null) params.set("min_price", String(options.minPrice));
  if (options?.maxPrice != null) params.set("max_price", String(options.maxPrice));
  if (options?.sort) params.set("sort", options.sort);
  const qs = params.toString();
  return `/api/products${qs ? `?${qs}` : ""}`;
}

export async function fetchProducts(options?: ProductListQuery): Promise<ProductsListPayload> {
  const url = `${API_URL}${productListPath(options)}`;

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

export type PriceRange = { min: number; max: number; count?: number };

/** Browser-side: slider bounds for the current shop filters (via the `/api/backend` proxy). */
export async function fetchPriceRange(filters: {
  q?: string;
  category?: string | null;
  brands?: string[];
}): Promise<PriceRange> {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.category) params.set("category", filters.category);
  if (filters.brands?.length) params.set("brands", filters.brands.join(","));
  const qs = params.toString();
  const data = await apiFetch<PriceRange>(
    `/api/products/price-range${qs ? `?${qs}` : ""}`,
  );
  return {
    min: Number(data.min) || 0,
    max: Number(data.max) || 0,
    count: Number(data.count) || 0,
  };
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
