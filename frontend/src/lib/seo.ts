import type { Metadata } from "next";
import { cache } from "react";
import { absoluteUrl, createPageMetadata, siteConfig } from "@/config/site";
import { getSiteSettings, type SeoPageKey } from "@/lib/siteSettings";

export type SeoDefaults = {
    siteName: string;
    titleTemplate: string;
    description: string;
    defaultImage: string;
    twitterHandle: string;
    keywords: string[];
    noIndexSite: boolean;
    logo: string;
    social: string[];
    contact: { phone: string | null; email: string | null };
    pages: Record<SeoPageKey, { title: string | null; description: string | null }>;
};

/** Site-wide SEO defaults from the dashboard (Marketing & SEO), falling back to `siteConfig`. */
export const getSeoDefaults = cache(async (): Promise<SeoDefaults> => {
    const s = await getSiteSettings();
    const siteName = s.site_name || siteConfig.name;
    const social = Object.values(s.chrome?.social ?? {}).filter(
        (url): url is string => typeof url === "string" && /^https:\/\/[^/]+\/.+/.test(url),
    );
    return {
        siteName,
        titleTemplate: s.seo.title_template || `%s | ${siteName}`,
        description: s.site_description || siteConfig.description,
        defaultImage: s.og_image?.path || siteConfig.logo.og,
        twitterHandle: s.twitter_handle || siteConfig.social.twitter,
        keywords: s.keywords
            ? s.keywords.split(",").map((k) => k.trim()).filter(Boolean)
            : [...siteConfig.keywords],
        noIndexSite: s.seo.noindex_site,
        logo: s.favicon?.path || absoluteUrl(siteConfig.logo.dark),
        social,
        contact: {
            phone: s.chrome?.topbar_phone ?? null,
            email: s.chrome?.topbar_email ?? null,
        },
        pages: s.seo.pages,
    };
});

type SeoMetaInput = Omit<
    Parameters<typeof createPageMetadata>[0] & object,
    "siteName" | "titleTemplate" | "defaultImage" | "twitterHandle"
>;

/** `createPageMetadata` with the dashboard's site name, title template and share image. */
export async function buildMetadata(input: SeoMetaInput): Promise<Metadata> {
    const d = await getSeoDefaults();
    return createPageMetadata({
        ...input,
        description: input.description ?? d.description,
        keywords: input.keywords ?? d.keywords,
        siteName: d.siteName,
        titleTemplate: d.titleTemplate,
        defaultImage: d.defaultImage,
        twitterHandle: d.twitterHandle,
    });
}

/** Metadata for an index page (home / shop / stores / brands) using its dashboard defaults. */
export async function buildIndexMetadata(
    key: SeoPageKey,
    fallback: { title: string; description: string; path: string; keywords?: string[] },
): Promise<Metadata> {
    const d = await getSeoDefaults();
    const page = d.pages[key];
    return buildMetadata({
        title: page.title || fallback.title,
        description: page.description || fallback.description,
        path: fallback.path,
        keywords: fallback.keywords,
    });
}

// ---------------------------------------------------------------------------
// JSON-LD builders (schema.org). Render with <JsonLd data={...} />.
// ---------------------------------------------------------------------------

type JsonLdObject = Record<string, unknown>;

const ORG_ID = absoluteUrl("/#organization");
const SITE_ID = absoluteUrl("/#website");

export function organizationJsonLd(d: SeoDefaults): JsonLdObject {
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": ORG_ID,
        name: d.siteName,
        url: absoluteUrl("/"),
        logo: absoluteUrl(d.logo),
        ...(d.social.length ? { sameAs: d.social } : {}),
        ...(d.contact.phone || d.contact.email
            ? {
                  contactPoint: {
                      "@type": "ContactPoint",
                      contactType: "customer service",
                      ...(d.contact.phone ? { telephone: d.contact.phone } : {}),
                      ...(d.contact.email ? { email: d.contact.email } : {}),
                  },
              }
            : {}),
    };
}

export function websiteJsonLd(d: SeoDefaults, inLanguage: string): JsonLdObject {
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": SITE_ID,
        name: d.siteName,
        url: absoluteUrl("/"),
        inLanguage,
        publisher: { "@id": ORG_ID },
        potentialAction: {
            "@type": "SearchAction",
            target: {
                "@type": "EntryPoint",
                urlTemplate: `${absoluteUrl("/shop")}?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
        },
    };
}

export type BreadcrumbItem = { name: string; path: string };

export function breadcrumbJsonLd(items: BreadcrumbItem[]): JsonLdObject {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: absoluteUrl(item.path),
        })),
    };
}

export function itemListJsonLd(
    name: string,
    items: { name: string; path: string; image?: string | null }[],
): JsonLdObject {
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name,
        numberOfItems: items.length,
        itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: absoluteUrl(item.path),
            name: item.name,
            ...(item.image ? { image: absoluteUrl(item.image) } : {}),
        })),
    };
}

type RatingSummary = { average: number; count: number } | null | undefined;

function aggregateRating(summary: RatingSummary) {
    if (!summary || summary.count < 1) return {};
    return {
        aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: summary.average,
            reviewCount: summary.count,
            bestRating: 5,
            worstRating: 1,
        },
    };
}

function sameAs(social: Record<string, string | null> | undefined) {
    const links = Object.values(social ?? {}).filter((v): v is string => Boolean(v));
    return links.length ? { sameAs: links } : {};
}

export function storeJsonLd(store: {
    name: string;
    slug: string;
    description?: string | null;
    logo?: string | null;
    image?: string | null;
    social?: Record<string, string | null>;
    contact?: { phone: string | null; email: string | null; address: string | null; hours: string | null };
    rating?: RatingSummary;
}): JsonLdObject {
    const c = store.contact;
    return {
        "@context": "https://schema.org",
        "@type": "Store",
        "@id": absoluteUrl(`/stores/${store.slug}#store`),
        name: store.name,
        url: absoluteUrl(`/stores/${store.slug}`),
        ...(store.description ? { description: store.description } : {}),
        ...(store.logo ? { logo: absoluteUrl(store.logo) } : {}),
        ...(store.image || store.logo ? { image: absoluteUrl((store.image || store.logo)!) } : {}),
        ...(c?.phone ? { telephone: c.phone } : {}),
        ...(c?.email ? { email: c.email } : {}),
        ...(c?.address ? { address: { "@type": "PostalAddress", streetAddress: c.address } } : {}),
        ...(c?.phone || c?.email
            ? {
                  contactPoint: {
                      "@type": "ContactPoint",
                      contactType: "customer service",
                      ...(c.phone ? { telephone: c.phone } : {}),
                      ...(c.email ? { email: c.email } : {}),
                      ...(c.hours ? { hoursAvailable: c.hours } : {}),
                  },
              }
            : {}),
        ...sameAs(store.social),
        ...aggregateRating(store.rating),
        parentOrganization: { "@id": ORG_ID },
    };
}

export function brandJsonLd(brand: {
    name: string;
    slug: string;
    description?: string | null;
    logo?: string | null;
    social?: Record<string, string | null>;
    rating?: RatingSummary;
}): JsonLdObject {
    return {
        "@context": "https://schema.org",
        "@type": "Brand",
        "@id": absoluteUrl(`/brands/${brand.slug}#brand`),
        name: brand.name,
        url: absoluteUrl(`/brands/${brand.slug}`),
        ...(brand.description ? { description: brand.description } : {}),
        ...(brand.logo ? { logo: absoluteUrl(brand.logo) } : {}),
        ...sameAs(brand.social),
        ...aggregateRating(brand.rating),
    };
}
