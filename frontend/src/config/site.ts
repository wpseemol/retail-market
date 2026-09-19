import type { Metadata } from "next";

/**
 * Static site configuration — single source of truth for SEO,
 * Open Graph, branding, and shared meta defaults.
 */
export const siteConfig = {
    name: "Niyenin",
    shortName: "Niyenin",
    tagline: "Retail Market",
    title: "Niyenin | Retail Market",
    description:
        "Shop electronics, gadgets, laptops, smartphones, and more at Niyenin Retail Market. Discover daily deals, top brands, and fast delivery.",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://niyenin.com",
    locale: "en_US",
    language: "en",
    keywords: [
        "Niyenin",
        "retail market",
        "online shop",
        "electronics",
        "gadgets",
        "laptops",
        "smartphones",
        "deals",
        "ecommerce",
    ],
    authors: [{ name: "Niyenin" }],
    creator: "Niyenin",
    publisher: "Niyenin",
    /** Relative path to the site logo (used for OG / Twitter cards). */
    logo: {
        light: "/logo/niyenin-white.png",
        dark: "/logo/niyenin-dark.png",
        /** Prefer dark logo (light wordmark) for social sharing contrast. */
        og: "/logo/niyenin-dark.png",
        width: 1200,
        height: 630,
        alt: "Niyenin — Retail Market logo",
    },
    contact: {
        phone: "+1(000)000-000",
        email: "support@niyenin.com",
    },
    social: {
        twitter: "@niyenin",
    },
    themeColor: {
        light: "#FFFFFF",
        dark: "#19191D",
        brand: "#00B207",
    },
} as const;

export type SiteConfig = typeof siteConfig;

/** Absolute URL helper from a site-relative path. */
export function absoluteUrl(path = "/"): string {
    const base = siteConfig.url.replace(/\/$/, "");
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${base}${normalized}`;
}

type PageMetaInput = {
    /** Page title segment — root layout applies `| Niyenin` via template. */
    title?: string;
    description?: string;
    path?: string;
    image?: string;
    noIndex?: boolean;
};

/** Build Next.js Metadata from the shared site config. */
export function createPageMetadata({
    title,
    description = siteConfig.description,
    path = "/",
    image = siteConfig.logo.og,
    noIndex = false,
}: PageMetaInput = {}): Metadata {
    const pageTitle = title
        ? `${title} | ${siteConfig.name}`
        : siteConfig.title;
    const url = absoluteUrl(path);
    const ogImage = absoluteUrl(image);

    return {
        title,
        description,
        keywords: [...siteConfig.keywords],
        authors: [...siteConfig.authors],
        creator: siteConfig.creator,
        publisher: siteConfig.publisher,
        metadataBase: new URL(siteConfig.url),
        alternates: {
            canonical: url,
        },
        openGraph: {
            type: "website",
            locale: siteConfig.locale,
            url,
            siteName: siteConfig.name,
            title: pageTitle,
            description,
            images: [
                {
                    url: ogImage,
                    width: siteConfig.logo.width,
                    height: siteConfig.logo.height,
                    alt: siteConfig.logo.alt,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: pageTitle,
            description,
            images: [ogImage],
            creator: siteConfig.social.twitter,
        },
        robots: noIndex
            ? { index: false, follow: false }
            : {
                  index: true,
                  follow: true,
                  googleBot: {
                      index: true,
                      follow: true,
                      "max-image-preview": "large",
                      "max-snippet": -1,
                      "max-video-preview": -1,
                  },
              },
    };
}
