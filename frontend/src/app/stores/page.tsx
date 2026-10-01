import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import StoresPageContent from "@/components/store/StoresPageContent";
import { format } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { breadcrumbJsonLd, buildIndexMetadata, getSeoDefaults, itemListJsonLd } from "@/lib/seo";
import { fetchStores } from "@/lib/stores";

type PageProps = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const [query, dict, seo] = await Promise.all([searchParams, getDictionary(), getSeoDefaults()]);
  const meta = await buildIndexMetadata("stores", {
    title: dict.showcase.storesTitle,
    description: dict.showcase.storesIntro,
    path: "/stores",
  });
  if (query.q?.trim() && !seo.noIndexSite) {
    return { ...meta, robots: { index: false, follow: true } };
  }
  return meta;
}

export default async function StoresPage({ searchParams }: PageProps) {
  const [query, dict, seo] = await Promise.all([searchParams, getDictionary(), getSeoDefaults()]);
  const t = dict.showcase;
  const page = Math.max(1, Number(query.page) || 1);
  const q = query.q?.trim().slice(0, 100) || undefined;
  const data = await fetchStores({ page, limit: 24, q });

  return (
    <main>
      <JsonLd
        id="stores-jsonld"
        data={[
          breadcrumbJsonLd([
            { name: t.home, path: "/" },
            { name: t.stores, path: "/stores" },
          ]),
          ...(data.stores.length && !q
            ? [
                itemListJsonLd(
                  format(t.storesListName, { site: seo.siteName }),
                  data.stores.map((s) => ({ name: s.shop_name, path: `/stores/${s.slug}`, image: s.logo?.path })),
                ),
              ]
            : []),
        ]}
      />
      <StoresPageContent
        stores={data.stores}
        total={data.pagination.total}
        page={data.pagination.page}
        totalPages={data.pagination.total_pages}
        q={q}
        t={t}
      />
    </main>
  );
}
