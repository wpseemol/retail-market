import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { API_URL } from "@/lib/api";
import { fetchContentPage } from "@/lib/contentPages";
import { getSiteSettings } from "@/lib/siteSettings";

type Entry = { slug: string; updated_at: string };
type SitemapEntries = {
    products: Entry[];
    categories: Entry[];
    stores: Entry[];
    brands: Entry[];
};

export const revalidate = 3600;

async function fetchEntries(): Promise<SitemapEntries> {
    try {
        const res = await fetch(`${API_URL}/api/sitemap-entries`, {
            next: { revalidate: 3600, tags: ["sitemap", "stores", "brands"] },
        });
        if (!res.ok) throw new Error(String(res.status));
        return (await res.json()) as SitemapEntries;
    } catch {
        return { products: [], categories: [], stores: [], brands: [] };
    }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const settings = await getSiteSettings();
    if (settings.seo.noindex_site) return [];

    const base = siteConfig.url.replace(/\/$/, "");
    const now = new Date();
    const [entries, faq, terms] = await Promise.all([
        fetchEntries(),
        fetchContentPage("faq"),
        fetchContentPage("terms"),
    ]);
    const contentRoutes: MetadataRoute.Sitemap = [
        { path: "/faq", page: faq },
        { path: "/terms", page: terms },
    ]
        .filter(({ page }) => page && !page.noindex)
        .map(({ path, page }) => ({
            url: `${base}${path}`,
            lastModified: page!.updated_at ? new Date(page!.updated_at) : now,
            changeFrequency: "monthly" as const,
            priority: 0.4,
        }));

    const staticRoutes: MetadataRoute.Sitemap = [
        { path: "", priority: 1, changeFrequency: "daily" as const },
        { path: "/shop", priority: 0.9, changeFrequency: "daily" as const },
        { path: "/stores", priority: 0.8, changeFrequency: "daily" as const },
        { path: "/brands", priority: 0.8, changeFrequency: "weekly" as const },
        { path: "/about", priority: 0.5, changeFrequency: "monthly" as const },
        { path: "/contact", priority: 0.5, changeFrequency: "monthly" as const },
    ].map(({ path, priority, changeFrequency }) => ({
        url: `${base}${path || "/"}`,
        lastModified: now,
        changeFrequency,
        priority,
    }));

    const map = (
        rows: Entry[],
        prefix: string,
        priority: number,
        changeFrequency: "daily" | "weekly",
    ): MetadataRoute.Sitemap =>
        rows.map((row) => ({
            url: `${base}${prefix}${encodeURIComponent(row.slug)}`,
            lastModified: new Date(row.updated_at),
            changeFrequency,
            priority,
        }));

    return [
        ...staticRoutes,
        ...contentRoutes,
        ...map(entries.stores, "/stores/", 0.7, "weekly"),
        ...map(entries.brands, "/brands/", 0.7, "weekly"),
        ...map(entries.categories, "/shop?category=", 0.6, "weekly"),
        ...map(entries.products, "/shop/", 0.8, "weekly"),
    ];
}
