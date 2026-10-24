import type { Metadata } from "next";
import ShopPageContent from "@/components/shop/ShopPageContent";
import { clampPerPage, perPageChoices } from "@/components/shop/data";
import type { ShopViewMode } from "@/components/shop/types";
import { siteConfig } from "@/config/site";
import { fetchProducts, toShopProduct } from "@/lib/products";
import { buildIndexMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/lib/siteSettings";
import { getLocale } from "@/i18n/server";

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
  const pageParam = Number(firstParam(params.page));
  if (
    firstParam(params.q) ||
    firstParam(params.brand) ||
    firstParam(params.per_page) ||
    (Number.isInteger(pageParam) && pageParam > 1)
  ) {
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

  const [settings, locale] = await Promise.all([getSiteSettings(), getLocale()]);
  const defaultPerPage = clampPerPage(settings.shop.products_per_page);
  const limit =
    initialPerPage && perPageChoices(defaultPerPage).includes(initialPerPage)
      ? initialPerPage
      : defaultPerPage;
  const requestedPage = Number(firstParam(params.page));
  const page =
    settings.shop.pagination_mode === "pages" &&
    Number.isInteger(requestedPage) &&
    requestedPage > 0
      ? requestedPage
      : 1;
  const data = await fetchProducts({
    page,
    limit,
    sort: "default",
    q: q || undefined,
    category: category || undefined,
    brand: brand || undefined,
  });
  const products = data.products.map((p) => toShopProduct(p, locale));
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
          max: data.facets.price.max || 0,
        }}
        tags={tags}
        defaultViewMode={settings.shop.default_view as ShopViewMode}
        productsPerPage={settings.shop.products_per_page}
        initialPerPage={initialPerPage}
        paginationMode={settings.shop.pagination_mode}
        initialPage={data.pagination?.page ?? page}
        initialTotal={data.pagination?.total ?? products.length}
        initialTotalPages={data.pagination?.total_pages ?? 1}
        locale={locale}
        categoriesVisible={settings.shop.categories_visible}
        brandsVisible={settings.shop.brands_visible}
        seeAllLabel={settings.shop.see_all_label}
        showLessLabel={settings.shop.show_less_label}
      />
    </main>
  );
}
