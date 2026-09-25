import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StorePageContent from "@/components/store/StorePageContent";
import { createPageMetadata, siteConfig } from "@/config/site";
import { fetchStoreBySlug } from "@/lib/stores";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchStoreBySlug(slug, { limit: 1 });
  if (!data) {
    return createPageMetadata({
      title: "Store not found",
      description: `This store is not available on ${siteConfig.name}.`,
      path: `/stores/${slug}`,
    });
  }

  const description =
    data.store.description?.trim() ||
    `Shop products from ${data.store.shop_name} on ${siteConfig.name}.`;

  return createPageMetadata({
    title: data.store.shop_name,
    description,
    path: `/stores/${data.store.slug}`,
  });
}

export default async function StoreDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);

  const data = await fetchStoreBySlug(slug, { page, limit: 24 });
  if (!data) notFound();

  return (
    <main>
      <StorePageContent
        store={data.store}
        products={data.products}
        featuredProducts={data.featured_products}
        total={data.pagination.total}
      />
    </main>
  );
}
