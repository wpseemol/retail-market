import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { DirectoryPage } from "@/components/showcase/DirectoryPage";
import { format } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { fetchBrands, type BrandListItem } from "@/lib/brands";
import { breadcrumbJsonLd, buildIndexMetadata, getSeoDefaults, itemListJsonLd } from "@/lib/seo";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function letterOf(name: string) {
  const first = name.trim().charAt(0).toUpperCase();
  return LETTERS.includes(first) ? first : "#";
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const [query, dict, seo] = await Promise.all([searchParams, getDictionary(), getSeoDefaults()]);
  const meta = await buildIndexMetadata("brands", {
    title: dict.showcase.brandsTitle,
    description: dict.showcase.brandsIntro,
    path: "/brands",
  });
  if (query.q?.trim() && !seo.noIndexSite) {
    return { ...meta, robots: { index: false, follow: true } };
  }
  return meta;
}

export default async function BrandsPage({ searchParams }: PageProps) {
  const [query, dict, seo] = await Promise.all([searchParams, getDictionary(), getSeoDefaults()]);
  const t = dict.showcase;
  const q = query.q?.trim().slice(0, 100) || undefined;
  const { brands, pagination } = await fetchBrands({ q });

  const groups = new Map<string, BrandListItem[]>();
  for (const brand of brands) {
    const key = letterOf(brand.name);
    groups.set(key, [...(groups.get(key) ?? []), brand]);
  }
  const keys = [...LETTERS, "#"].filter((key) => groups.has(key));

  return (
    <main>
      <JsonLd
        id="brands-jsonld"
        data={[
          breadcrumbJsonLd([
            { name: t.home, path: "/" },
            { name: t.brands, path: "/brands" },
          ]),
          ...(brands.length && !q
            ? [
                itemListJsonLd(
                  format(t.brandsListName, { site: seo.siteName }),
                  brands.map((b) => ({ name: b.name, path: `/brands/${b.slug}`, image: b.image?.path })),
                ),
              ]
            : []),
        ]}
      />
      <DirectoryPage
        t={t}
        path="/brands"
        title={t.brandsTitle}
        kicker={t.brandsKicker}
        intro={t.brandsIntro}
        listTitle={t.allBrands}
        searchPlaceholder={t.brandsSearch}
        countLabel={pagination.total === 1 ? t.brandsCountOne : format(t.brandsCount, { count: pagination.total })}
        q={q}
        emptyTitle={t.noBrands}
        emptyHint={t.noBrandsHint}
        isEmpty={brands.length === 0}
        toolbar={
          keys.length > 1 ? (
            <nav
              aria-label={t.jumpTo}
              className="mb-6 rounded-lg border border-border-default bg-bg-subtle/40 px-3 py-2.5"
            >
              <ul className="flex flex-wrap gap-1">
                {[...LETTERS, "#"].map((key) => (
                  <li key={key}>
                    {groups.has(key) ? (
                      <a
                        href={`#letter-${key === "#" ? "other" : key}`}
                        className="flex size-8 items-center justify-center rounded-md text-[13px] font-semibold text-text-primary hover:bg-brand-primary hover:text-white"
                      >
                        {key}
                      </a>
                    ) : (
                      <span aria-hidden="true" className="flex size-8 items-center justify-center text-[13px] text-text-secondary/40">
                        {key}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ) : null
        }
      >
        <div className="space-y-10">
          {keys.map((key) => (
            <section key={key} id={`letter-${key === "#" ? "other" : key}`} aria-labelledby={`h-letter-${key}`} className="scroll-mt-40">
              <h2
                id={`h-letter-${key}`}
                className="mb-4 flex items-center gap-3 text-2xl font-semibold text-text-primary"
              >
                {key}
                <span aria-hidden="true" className="h-px flex-1 bg-border-default" />
              </h2>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {groups.get(key)!.map((brand) => (
                  <li key={brand.id}>
                    <Link
                      href={`/brands/${brand.slug}`}
                      className="group flex h-full flex-col items-center rounded-xl border border-border-default bg-bg-surface p-4 text-center hover:border-brand-primary"
                    >
                      <span className="flex h-16 w-full items-center justify-center overflow-hidden">
                        {brand.image?.path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={brand.image.path}
                            alt={brand.image.alt_text ?? brand.name}
                            loading="lazy"
                            decoding="async"
                            className="max-h-16 max-w-full object-contain"
                          />
                        ) : (
                          <span className="flex size-14 items-center justify-center rounded-full bg-brand-tint text-xl font-semibold text-brand-deep">
                            {brand.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </span>
                      <span className="mt-3 line-clamp-1 text-[14px] font-semibold text-text-primary group-hover:text-brand-primary">
                        {brand.name}
                      </span>
                      <span className="mt-0.5 text-[12px] text-text-secondary">
                        {brand.products_count === 1
                          ? t.productsCountOne
                          : format(t.productsCount, { count: brand.products_count })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DirectoryPage>
    </main>
  );
}
