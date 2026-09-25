import type { Metadata } from "next";
import StoresPageContent from "@/components/store/StoresPageContent";
import { createPageMetadata, siteConfig } from "@/config/site";
import { fetchStores } from "@/lib/stores";

type PageProps = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Stores",
  description: `Explore partner stores and shop their catalogs on ${siteConfig.name}.`,
  path: "/stores",
});

export default async function StoresPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);
  const q = query.q?.trim() || undefined;
  const data = await fetchStores({ page, limit: 24, q });

  return (
    <main>
      <StoresPageContent
        stores={data.stores}
        total={data.pagination.total}
        q={q}
      />
    </main>
  );
}
