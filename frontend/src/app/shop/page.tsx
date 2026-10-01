import type { Metadata } from "next";
import ShopPageContent from "@/components/shop/ShopPageContent";
import type { ShopViewMode } from "@/components/shop/types";
import { siteConfig } from "@/config/site";
import { fetchProducts, toShopProduct } from "@/lib/products";
import { buildIndexMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/lib/siteSettings";

type ShopSearchParams = Promise<Record<string, string | string[] | undefined>>;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 120) ?? "";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: ShopSearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const base = await buildIndexMetadata("shop", {
    title: "Shop",
    description: `Browse electronics, gadgets, and more at ${siteConfig.name}. Filter by price, brand, and category.`,
    path: "/shop",
  });
  // Filtered / searched listings are thin duplicates of /shop and brand pages.
  if (firstParam(params.q) || firstParam(params.brand) || firstParam(params.per_page)) {
    return { ...base, robots: { index: false, follow: true } };
  }
  return base;
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: ShopSearchParams;
}) {
  const params = await searchParams;
  const q = firstParam(params.q);
  const category = firstParam(params.category);
  const brandParam = firstParam(params.brand).toLowerCase();
  const brand = SLUG_RE.test(brandParam) ? brandParam : "";
  const perPageParam = firstParam(params.per_page);
  const initialPerPage = /^\d{1,2}$/.test(perPageParam) ? Number(perPageParam) : null;

  const [data, settings] = await Promise.all([
    fetchProducts({
      limit: 48,
      sort: "default",
      q: q || undefined,
      category: category || undefined,
      brand: brand || undefined,
    }),
    getSiteSettings(),
  ]);
  const products = data.products.map(toShopProduct);
  const tags = Array.from(
    new Set(
      products.flatMap((p) => p.tags).filter((t) => t && t !== "featured"),
    ),
  ).slice(0, 12);

  return (
    <main>
      <ShopPageContent
        key={`${q}|${category}|${brand}`}
        initialSearch={q}
        initialCategory={category || null}
        initialBrand={brand || null}
        products={products}
        categories={data.facets.categories}
        brands={data.facets.brands}
        priceRange={{
          min: data.facets.price.min || 0,
          max: data.facets.price.max || 1000,
        }}
        tags={tags}
        defaultViewMode={settings.shop.default_view as ShopViewMode}
        productsPerPage={settings.shop.products_per_page}
        initialPerPage={initialPerPage}
        categoriesVisible={settings.shop.categories_visible}
        brandsVisible={settings.shop.brands_visible}
        seeAllLabel={settings.shop.see_all_label}
        showLessLabel={settings.shop.show_less_label}
      />
    </main>
  );
}
