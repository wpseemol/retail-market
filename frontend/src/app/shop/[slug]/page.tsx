import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import ProductPageContent from "@/components/shop/ProductPageContent";
import { createPageMetadata, siteConfig } from "@/config/site";
import {
  fetchProductByIdOrSlug,
  toShopProduct,
} from "@/lib/products";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchProductByIdOrSlug(slug);

  if (!data) {
    return createPageMetadata({
      title: "Product Not Found",
      path: `/shop/${slug}`,
      noIndex: true,
    });
  }

  const product = data.product;
  const image =
    product.thumbnail?.path ||
    product.gallery?.[0]?.path ||
    siteConfig.logo.og;

  return createPageMetadata({
    title: product.name,
    description:
      product.short_description ||
      product.description ||
      `Buy ${product.name} at ${siteConfig.name}.`,
    path: `/shop/${product.slug}`,
    image,
  });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  console.log("[shop/slug] loading product", slug, "API_URL", process.env.NEXT_PUBLIC_API_URL);
  const data = await fetchProductByIdOrSlug(slug);
  console.log("[shop/slug] result", data ? data.product.slug : null);

  if (!data) {
    notFound();
  }

  // Prefer slug URLs — redirect numeric id links to the canonical slug.
  if (/^\d+$/.test(slug) && data.product.slug !== slug) {
    redirect(`/shop/${data.product.slug}`);
  }

  const product = toShopProduct(data.product);
  const related = data.related.map(toShopProduct);
  const store =
    data.product.vendor != null
      ? {
          name: data.product.vendor.shop_name,
          slug: data.product.vendor.slug,
        }
      : null;

  return (
    <main>
      <ProductPageContent
        product={product}
        relatedProducts={related}
        store={store}
      />
    </main>
  );
}
