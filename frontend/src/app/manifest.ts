import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getSiteSettings } from "@/lib/siteSettings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
    const settings = await getSiteSettings();
    const name = settings.site_name || siteConfig.name;
    const icon = settings.favicon?.path;

    return {
        name: settings.site_title || siteConfig.title,
        short_name: name,
        description: settings.site_description || siteConfig.description,
        start_url: "/",
        display: "standalone",
        background_color: siteConfig.themeColor.light,
        theme_color: siteConfig.themeColor.brand,
        icons: icon
            ? [{ src: icon, sizes: "512x512", type: "image/png", purpose: "any" }]
            : [{ src: siteConfig.logo.dark, sizes: "any", type: "image/png" }],
    };
}
