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
    /** Staff / seller dashboard origin (Vite app). */
    dashboardUrl:
        process.env.NEXT_PUBLIC_DASHBOARD_URL?.replace(/\/$/, "") ??
        "http://localhost:5173",
    locale: "en_BD",
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

/** Absolute URL helper from a site-relative path (absolute URLs pass through). */
export function absoluteUrl(path = "/"): string {
    if (/^https?:\/\//i.test(path)) return path;
    const base = siteConfig.url.replace(/\/$/, "");
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${base}${normalized}`;
}

export type DashboardLoginRole =
    | "super_admin"
    | "admin"
    | "moderator"
    | "vendor";

/** Dashboard login URL, optionally pre-selecting a workspace. */
export function dashboardLoginUrl(role?: DashboardLoginRole): string {
    const base = `${siteConfig.dashboardUrl}/login`;
    return role ? `${base}?role=${role}` : base;
}

type PageMetaInput = {
    /** Page title segment — root layout applies `| Niyenin` via template. */
    title?: string;
    description?: string;
    path?: string;
    image?: string;
    /** Extra share images after `image` (e.g. product gallery). */
    images?: string[];
    imageAlt?: string;
    keywords?: string[];
    /** Extra `<meta property>` tags, e.g. `product:price:amount`. */
    other?: Record<string, string | number>;
    noIndex?: boolean;
};

/** Plain-text meta description: strips HTML, collapses whitespace, trims to ~160 chars. */
export function toMetaDescription(text: string, max = 160): string {
    const plain = text
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (plain.length <= max) return plain;
    const cut = plain.slice(0, max - 1);
    const lastSpace = cut.lastIndexOf(" ");
    return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}

/** Build Next.js Metadata from the shared site config. */
export function createPageMetadata({
    title,
    description = siteConfig.description,
    path = "/",
    image = siteConfig.logo.og,
    images = [],
    imageAlt,
    keywords = [],
    other,
    noIndex = false,
}: PageMetaInput = {}): Metadata {
    const pageTitle = title
        ? `${title} | ${siteConfig.name}`
        : siteConfig.title;
    const url = absoluteUrl(path);
    const ogImage = absoluteUrl(image);
    const isLogo = image === siteConfig.logo.og;
    const ogImages = [
        isLogo
            ? {
                  url: ogImage,
                  width: siteConfig.logo.width,
                  height: siteConfig.logo.height,
                  alt: siteConfig.logo.alt,
              }
            : { url: ogImage, alt: imageAlt ?? title ?? siteConfig.name },
        ...images
            .filter((src) => src && src !== image)
            .map((src) => ({
                url: absoluteUrl(src),
                alt: imageAlt ?? title ?? siteConfig.name,
            })),
    ];

    return {
        title,
        description,
        keywords: [...new Set([...keywords, ...siteConfig.keywords])],
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
            images: ogImages,
        },
        twitter: {
            card: "summary_large_image",
            title: pageTitle,
            description,
            images: [{ url: ogImage, alt: ogImages[0].alt }],
            creator: siteConfig.social.twitter,
        },
        ...(other ? { other } : {}),
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
