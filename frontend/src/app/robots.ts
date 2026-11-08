import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getSiteSettings } from "@/lib/siteSettings";

/** Private / transactional paths — keep out of search + AI indexes. */
const DISALLOW = [
  "/cart",
  "/checkout",
  "/auth/",
  "/api/",
  "/account",
  "/wishlist",
] as const;

/**
 * Allow Google + popular AI crawlers (ChatGPT, Gemini, DeepSeek, Perplexity, Claude, …).
 * `*` already permits them; named rules make intent explicit for SEO audits.
 */
const AI_USER_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "Google-Extended",
  "Googlebot",
  "Googlebot-Image",
  "Bingbot",
  "DuckAssistBot",
  "anthropic-ai",
  "ClaudeBot",
  "PerplexityBot",
  "Bytespider", // Doubao / TikTok / DeepSeek-related crawl family
  "CCBot",
  "meta-externalagent",
] as const;

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
        disallow: [...DISALLOW],
      },
      ...AI_USER_AGENTS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: [...DISALLOW],
      })),
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
