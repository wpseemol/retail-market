import type { Metadata } from "next";
import ShopPageContent from "@/components/shop/ShopPageContent";
import { createPageMetadata, siteConfig } from "@/config/site";
import { fetchProducts, toShopProduct } from "@/lib/products";

export const metadata: Metadata = createPageMetadata({
  title: "Shop",
  description: `Browse electronics, gadgets, and more at ${siteConfig.name}. Filter by price, brand, and category.`,
  path: "/shop",
});

export default async function ShopPage() {
  const data = await fetchProducts({ limit: 48, sort: "default" });
  const products = data.products.map(toShopProduct);
  const tags = Array.from(
    new Set(
      products.flatMap((p) => p.tags).filter((t) => t && t !== "featured"),
    ),
  ).slice(0, 12);

  return (
    <main>
      <ShopPageContent
        products={products}
        categories={data.facets.categories}
        brands={data.facets.brands}
        priceRange={{
          min: data.facets.price.min || 0,
          max: data.facets.price.max || 1000,
        }}
        tags={tags}
      />
    </main>
  );
}
