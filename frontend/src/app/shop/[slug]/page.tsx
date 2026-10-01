import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import ProductPageContent from "@/components/shop/ProductPageContent";
import {
  absoluteUrl,
  createPageMetadata,
  siteConfig,
  toMetaDescription,
} from "@/config/site";
import { CURRENCY_CODE } from "@/lib/money";
import {
  fetchProductByIdOrSlug,
  toShopProduct,
  type ApiProduct,
} from "@/lib/products";
import {
  fetchProductReviews,
  reviewsJsonLd,
  type ReviewsPayload,
} from "@/lib/reviews";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

function productImages(product: ApiProduct): string[] {
  const paths = [
    product.thumbnail?.path,
    ...(product.gallery ?? []).map((g) => g.path),
  ].filter((p): p is string => Boolean(p));
  return [...new Set(paths)];
}

function productDescription(product: ApiProduct): string {
  const brand = product.brand_name || product.brand?.name;
  return toMetaDescription(
    product.short_description ||
      product.description ||
      `Buy ${product.name}${brand ? ` by ${brand}` : ""} online at ${siteConfig.name}. Best price in Bangladesh with fast delivery.`,
  );
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
  const images = productImages(product);
  const brand = product.brand_name || product.brand?.name;
  const price = Number(product.price) || 0;

  return createPageMetadata({
    title: product.name,
    description: productDescription(product),
    path: `/shop/${product.slug}`,
    image: images[0] ?? siteConfig.logo.og,
    images: images.slice(1, 4),
    imageAlt: product.thumbnail?.alt_text || product.name,
    keywords: [
      product.name,
      brand,
      product.category?.name,
      product.vendor?.shop_name,
    ].filter((k): k is string => Boolean(k)),
    other: {
      "product:price:amount": price.toFixed(2),
      "product:price:currency": CURRENCY_CODE,
      "product:availability": product.stock_qty > 0 ? "in stock" : "out of stock",
      "product:condition": "new",
      ...(brand ? { "product:brand": brand } : {}),
      ...(product.sku ? { "product:retailer_item_id": product.sku } : {}),
    },
  });
}

function productJsonLd(product: ApiProduct, reviews: ReviewsPayload) {
  const url = absoluteUrl(`/shop/${product.slug}`);
  const images = productImages(product).map((src) => absoluteUrl(src));
  const brand = product.brand_name || product.brand?.name;
  const price = Number(product.price) || 0;

  const breadcrumbs = [
    { name: "Home", url: absoluteUrl("/") },
    { name: "Shop", url: absoluteUrl("/shop") },
    ...(product.vendor
      ? [
          {
            name: product.vendor.shop_name,
            url: absoluteUrl(`/stores/${product.vendor.slug}`),
          },
        ]
      : []),
    { name: product.name, url },
  ];

  return [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": `${url}#product`,
      name: product.name,
      description: productDescription(product),
      url,
      image: images.length > 0 ? images : [absoluteUrl(siteConfig.logo.og)],
      ...(product.sku ? { sku: product.sku, mpn: product.sku } : {}),
      ...(brand ? { brand: { "@type": "Brand", name: brand } } : {}),
      ...(product.category ? { category: product.category.name } : {}),
      offers: {
        "@type": "Offer",
        url,
        price: price.toFixed(2),
        priceCurrency: CURRENCY_CODE,
        itemCondition: "https://schema.org/NewCondition",
        availability:
          product.stock_qty > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        seller: {
          "@type": "Organization",
          name: product.vendor?.shop_name ?? siteConfig.name,
        },
      },
      ...reviewsJsonLd(reviews),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: crumb.url,
      })),
    },
  ];
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const data = await fetchProductByIdOrSlug(slug);

  if (!data) {
    notFound();
  }

  // Prefer slug URLs — redirect numeric id links to the canonical slug.
  if (/^\d+$/.test(slug) && data.product.slug !== slug) {
    redirect(`/shop/${data.product.slug}`);
  }

  const reviews = await fetchProductReviews(data.product.slug);
  const product = {
    ...toShopProduct(data.product),
    rating: reviews.summary.average,
    reviewCount: reviews.summary.count,
  };
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
      <script
        type="application/ld+json"
        // `<` is escaped so product text can never close the script tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd(data.product, reviews)).replace(
            /</g,
            "\\u003c",
          ),
        }}
      />
      <ProductPageContent
        key={product.id}
        product={product}
        relatedProducts={related}
        store={store}
        shareUrl={absoluteUrl(`/shop/${product.slug}`)}
        inStock={data.product.stock_qty > 0}
        reviews={reviews}
      />
    </main>
  );
}
