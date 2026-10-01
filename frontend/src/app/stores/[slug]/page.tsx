import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { AnnouncementBar } from "@/components/showcase/AnnouncementBar";
import { ShowcaseBreadcrumb } from "@/components/showcase/ShowcaseBreadcrumb";
import { ShowcaseHero } from "@/components/showcase/ShowcaseHero";
import { ShowcaseSections } from "@/components/showcase/ShowcaseSections";
import { ShowcaseTheme } from "@/components/showcase/ShowcaseTheme";
import { format, LOCALE_TAGS } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/server";
import { breadcrumbJsonLd, buildMetadata, getSeoDefaults, itemListJsonLd, storeJsonLd } from "@/lib/seo";
import { fetchShowcaseReviews, parseSort, type StorefrontSort } from "@/lib/showcase";
import { fetchStoreBySlug } from "@/lib/stores";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
};

/** Same options for metadata and page so Next dedupes the fetch; page size comes from the store's settings. */
function pageQuery(query: { page?: string; sort?: string }) {
  return { page: Math.max(1, Number(query.page) || 1), sort: parseSort(query.sort) };
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [{ slug }, query, dict, seo] = await Promise.all([params, searchParams, getDictionary(), getSeoDefaults()]);
  const t = dict.showcase;
  const data = await fetchStoreBySlug(slug, pageQuery(query));
  if (!data) {
    return buildMetadata({ title: t.storeNotFound, path: `/stores/${slug}`, noIndex: true });
  }

  const { store } = data;
  const description =
    store.seo.description ||
    store.tagline ||
    store.description?.trim() ||
    format(t.storeFallbackDescription, { name: store.shop_name, site: seo.siteName });

  return buildMetadata({
    title: store.seo.title || store.shop_name,
    description: description.slice(0, 170),
    path: `/stores/${store.slug}`,
    image: store.seo.og_image?.path || store.logo?.path || store.banner?.path || undefined,
    imageAlt: store.shop_name,
    keywords: store.seo.keywords
      ? store.seo.keywords.split(",").map((k) => k.trim()).filter(Boolean)
      : undefined,
    noIndex: store.seo.noindex || Boolean(query.sort),
    ogType: "profile",
  });
}

export default async function StoreDetailPage({ params, searchParams }: PageProps) {
  const [{ slug }, query, dict, locale] = await Promise.all([params, searchParams, getDictionary(), getLocale()]);
  const t = dict.showcase;
  const data = await fetchStoreBySlug(slug, pageQuery(query));
  if (!data) notFound();

  const { store, products, pagination } = data;
  const content = store.showcase;
  const reviews = content.sections.includes("reviews") ? await fetchShowcaseReviews("shops", store.slug) : null;
  const defaultSort = (parseSort(store.product_sort) ?? "featured_first") as StorefrontSort;
  const path = `/stores/${store.slug}`;
  const crumbs = [
    { name: t.home, path: "/" },
    { name: t.stores, path: "/stores" },
    { name: store.shop_name, path },
  ];

  return (
    <main>
      <JsonLd
        id="store-jsonld"
        data={[
          storeJsonLd({
            name: store.shop_name,
            slug: store.slug,
            description: store.seo.description || store.tagline || store.description,
            logo: store.logo?.path,
            image: store.banner?.path,
            social: content.social,
            contact: content.contact,
            rating: store.review_summary,
          }),
          breadcrumbJsonLd(crumbs),
          ...(products.length
            ? [
                itemListJsonLd(
                  format(t.productsListName, { name: store.shop_name }),
                  products.map((p) => ({ name: p.name, path: `/shop/${p.slug}`, image: p.thumbnail?.path })),
                ),
              ]
            : []),
        ]}
      />
      <ShowcaseTheme accent={store.accent_color}>
        <AnnouncementBar announcement={content.announcement} />
        <ShowcaseBreadcrumb
          label={t.breadcrumb}
          items={[{ name: t.home, href: "/" }, { name: t.stores, href: "/stores" }, { name: store.shop_name }]}
        />
        <ShowcaseHero
          style={content.hero_style}
          kicker={t.storeKicker}
          name={store.shop_name}
          tagline={store.tagline}
          description={store.description}
          logo={store.logo}
          banner={store.banner ?? null}
          rating={{
            average: store.review_summary.average,
            count: store.review_summary.count,
            label: format(dict.reviews.starsLabel, { rating: store.review_summary.average.toFixed(1) }),
            countLabel:
              store.review_summary.count === 1
                ? dict.reviews.basedOnOne
                : format(dict.reviews.basedOn, { count: store.review_summary.count }),
          }}
          meta={
            <span>
              {pagination.total === 1 ? t.productsCountOne : format(t.productsCount, { count: pagination.total })}
            </span>
          }
        />

        {store.brands.length > 0 ? (
          <section aria-labelledby="store-brands" className="border-b border-border-default bg-bg-subtle/40">
            <div className="container mx-auto flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
              <h2 id="store-brands" className="mr-1 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
                {t.brandsFromStore}
              </h2>
              <ul className="flex flex-wrap gap-2">
                {store.brands.map((brand) => (
                  <li key={brand.id}>
                    <Link
                      href={`/brands/${brand.slug}`}
                      className="inline-flex items-center gap-2 rounded-full border border-border-default bg-bg-surface py-1 pl-1 pr-3.5 text-[13px] font-medium text-text-primary hover:border-sc-accent hover:text-sc-accent-text"
                    >
                      <span className="flex size-6 items-center justify-center overflow-hidden rounded-full bg-bg-subtle text-[11px]">
                        {brand.image?.path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={brand.image.path} alt="" className="size-full object-contain" />
                        ) : (
                          brand.name.charAt(0).toUpperCase()
                        )}
                      </span>
                      {brand.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        <ShowcaseSections
          content={content}
          name={store.shop_name}
          dict={dict}
          intlLocale={LOCALE_TAGS[locale].intl}
          featured={data.featured_products ?? []}
          reviews={reviews}
          grid={{
            products,
            total: pagination.total,
            page: pagination.page,
            totalPages: pagination.total_pages,
            sort: data.sort ?? defaultSort,
            defaultSort,
            basePath: path,
          }}
        />
      </ShowcaseTheme>
    </main>
  );
}
