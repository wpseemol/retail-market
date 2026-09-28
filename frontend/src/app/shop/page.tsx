import type { Metadata } from "next";
import ShopPageContent from "@/components/shop/ShopPageContent";
import type { ShopViewMode } from "@/components/shop/types";
import { createPageMetadata, siteConfig } from "@/config/site";
import { fetchProducts, toShopProduct } from "@/lib/products";
import { getSiteSettings } from "@/lib/siteSettings";

export const metadata: Metadata = createPageMetadata({
  title: "Shop",
  description: `Browse electronics, gadgets, and more at ${siteConfig.name}. Filter by price, brand, and category.`,
  path: "/shop",
});

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 120) ?? "";
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = firstParam(params.q);
  const category = firstParam(params.category);

  const [data, settings] = await Promise.all([
    fetchProducts({
      limit: 48,
      sort: "default",
      q: q || undefined,
      category: category || undefined,
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
        key={`${q}|${category}`}
        initialSearch={q}
        initialCategory={category || null}
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
        categoriesVisible={settings.shop.categories_visible}
        brandsVisible={settings.shop.brands_visible}
        seeAllLabel={settings.shop.see_all_label}
        showLessLabel={settings.shop.show_less_label}
      />
    </main>
  );
}
