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
import { fetchBrandBySlug } from "@/lib/brands";
import { brandJsonLd, breadcrumbJsonLd, buildMetadata, getSeoDefaults, itemListJsonLd } from "@/lib/seo";
import { fetchShowcaseReviews, parseSort } from "@/lib/showcase";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
};

/** Same options for metadata and page so Next dedupes the fetch. */
function pageQuery(query: { page?: string; sort?: string }) {
  return { page: Math.max(1, Number(query.page) || 1), sort: parseSort(query.sort), limit: 24 };
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [{ slug }, query, dict, seo] = await Promise.all([params, searchParams, getDictionary(), getSeoDefaults()]);
  const t = dict.showcase;
  const data = await fetchBrandBySlug(slug, pageQuery(query));
  if (!data) {
    return buildMetadata({ title: t.brandNotFound, path: `/brands/${slug}`, noIndex: true });
  }

  const { brand } = data;
  const description =
    brand.seo.description ||
    brand.tagline ||
    brand.description?.trim() ||
    format(t.brandFallbackDescription, { name: brand.name, site: seo.siteName });

  return buildMetadata({
    title: brand.seo.title || brand.name,
    description: description.slice(0, 170),
    path: `/brands/${brand.slug}`,
    image: brand.seo.og_image?.path || brand.banner?.path || brand.image?.path || undefined,
    imageAlt: brand.name,
    keywords: brand.seo.keywords
      ? brand.seo.keywords.split(",").map((k) => k.trim()).filter(Boolean)
      : undefined,
    noIndex: brand.seo.noindex || Boolean(query.sort),
  });
}

export default async function BrandDetailPage({ params, searchParams }: PageProps) {
  const [{ slug }, query, dict, locale] = await Promise.all([params, searchParams, getDictionary(), getLocale()]);
  const t = dict.showcase;
  const data = await fetchBrandBySlug(slug, pageQuery(query));
  if (!data) notFound();

  const { brand, products, pagination } = data;
  const content = brand.showcase;
  const reviews = content.sections.includes("reviews") ? await fetchShowcaseReviews("brands", brand.slug) : null;
  const path = `/brands/${brand.slug}`;
  const summary = brand.review_summary;

  const actions = (
    <>
      <Link
        href={`/shop?brand=${encodeURIComponent(brand.slug)}`}
        className="inline-flex h-10 items-center rounded-full bg-sc-accent px-5 text-sm font-semibold text-sc-on-accent hover:opacity-90"
      >
        {format(t.shopAll, { name: brand.name })}
      </Link>
      {brand.store ? (
        <Link
          href={`/stores/${brand.store.slug}`}
          className={
            content.hero_style === "banner"
              ? "inline-flex h-10 items-center rounded-full border border-white/50 px-5 text-sm font-medium text-white hover:bg-white/10"
              : "inline-flex h-10 items-center rounded-full border border-border-default px-5 text-sm font-medium text-text-primary hover:border-sc-accent hover:text-sc-accent-text"
          }
        >
          {t.visitStore}
        </Link>
      ) : null}
    </>
  );

  return (
    <main>
      <JsonLd
        id="brand-jsonld"
        data={[
          brandJsonLd({
            name: brand.name,
            slug: brand.slug,
            description: brand.seo.description || brand.tagline || brand.description,
            logo: brand.image?.path,
            social: content.social,
            rating: summary,
          }),
          breadcrumbJsonLd([
            { name: t.home, path: "/" },
            { name: t.brands, path: "/brands" },
            { name: brand.name, path },
          ]),
          ...(products.length
            ? [
                itemListJsonLd(
                  format(t.productsListName, { name: brand.name }),
                  products.map((p) => ({ name: p.name, path: `/shop/${p.slug}`, image: p.thumbnail?.path })),
                ),
              ]
            : []),
        ]}
      />
      <ShowcaseTheme accent={brand.accent_color}>
        <AnnouncementBar announcement={content.announcement} />
        <ShowcaseBreadcrumb
          label={t.breadcrumb}
          items={[{ name: t.home, href: "/" }, { name: t.brands, href: "/brands" }, { name: brand.name }]}
        />
        <ShowcaseHero
          style={content.hero_style}
          kicker={t.brandKicker}
          name={brand.name}
          tagline={brand.tagline}
          description={brand.description}
          logo={brand.image}
          banner={brand.banner}
          rating={{
            average: summary.average,
            count: summary.count,
            label: format(dict.reviews.starsLabel, { rating: summary.average.toFixed(1) }),
            countLabel: summary.count === 1 ? dict.reviews.basedOnOne : format(dict.reviews.basedOn, { count: summary.count }),
          }}
          meta={
            <>
              <span>
                {pagination.total === 1 ? t.productsCountOne : format(t.productsCount, { count: pagination.total })}
              </span>
              {brand.store ? (
                <span>
                  {t.soldBy}{" "}
                  <Link href={`/stores/${brand.store.slug}`} className="font-semibold underline-offset-4 hover:underline">
                    {brand.store.shop_name}
                  </Link>
                </span>
              ) : null}
            </>
          }
          actions={actions}
        />

        <ShowcaseSections
          content={content}
          name={brand.name}
          dict={dict}
          intlLocale={LOCALE_TAGS[locale].intl}
          featured={data.featured_products}
          reviews={reviews}
          hideBrand
          grid={{
            products,
            total: pagination.total,
            page: pagination.page,
            totalPages: pagination.total_pages,
            sort: data.sort,
            basePath: path,
          }}
        />
      </ShowcaseTheme>
    </main>
  );
}
