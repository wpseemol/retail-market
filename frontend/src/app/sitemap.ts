import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { shopProducts } from "@/components/shop/data";

export default function sitemap(): MetadataRoute.Sitemap {
    const base = siteConfig.url.replace(/\/$/, "");
    const now = new Date();

    const staticRoutes: MetadataRoute.Sitemap = [
        "",
        "/shop",
        "/about",
        "/contact",
        "/auth/login",
        "/auth/register",
    ].map((path) => ({
        url: `${base}${path || "/"}`,
        lastModified: now,
        changeFrequency: path === "" || path === "/shop" ? "daily" : "weekly",
        priority: path === "" ? 1 : path === "/shop" ? 0.9 : 0.7,
    }));

    const productRoutes: MetadataRoute.Sitemap = shopProducts.map(
        (product) => ({
            url: `${base}/shop/${product.id}`,
            lastModified: now,
            changeFrequency: "weekly" as const,
            priority: 0.8,
        }),
    );

    return [...staticRoutes, ...productRoutes];
}
