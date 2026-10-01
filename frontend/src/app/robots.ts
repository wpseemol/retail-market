import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getSiteSettings } from "@/lib/siteSettings";

export default async function robots(): Promise<MetadataRoute.Robots> {
    const base = siteConfig.url.replace(/\/$/, "");
    const settings = await getSiteSettings();

    if (settings.seo.noindex_site) {
        return { rules: [{ userAgent: "*", disallow: "/" }] };
    }

    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: ["/cart", "/checkout", "/auth/", "/api/", "/account", "/wishlist"],
            },
        ],
        sitemap: `${base}/sitemap.xml`,
        host: base,
    };
}
