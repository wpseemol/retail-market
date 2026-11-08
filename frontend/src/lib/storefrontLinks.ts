import { dashboardLoginUrl } from "@/config/site";
import { categoryShopHref } from "@/lib/categories";

/**
 * Top-level App Router segments that are real pages (not category shortcuts).
 * Bare paths like `/automotive` from CMS nav are rewritten to `/shop?category=…`.
 */
const KNOWN_TOP_SEGMENTS = new Set([
  "shop",
  "stores",
  "brands",
  "cart",
  "checkout",
  "account",
  "wishlist",
  "login",
  "register",
  "faq",
  "terms",
  "about",
  "contact",
  "offline",
  "privacy-policy",
  "bulk-order",
  "api",
  "auth",
  "icons",
  "images",
  "logo",
  "fonts",
  "_next",
]);

/** Old seed / CMS paths that are not category slugs. */
const LEGACY_EXACT: Record<string, string> = {
  "/blog": "/shop",
  "/quick-links": "/shop",
  "/track-order": "/account/orders",
  "/customer-service": "/contact",
  "/support": "/contact",
  "/returns": "/faq",
};

/**
 * Normalize CMS / seed hrefs so `<Link>` never prefetches a missing route
 * (avoids console 404s like `/automotive?_rsc=…`).
 */
export function normalizeStorefrontPath(href: string): string {
  const raw = href.trim();
  if (!raw || raw === "#" || raw.startsWith("#")) return raw;
  if (/^https?:\/\//i.test(raw) || raw.startsWith("mailto:") || raw.startsWith("tel:")) {
    return raw;
  }
  if (raw === "dashboard" || raw.startsWith("dashboard:")) return raw;

  const pathOnly = raw.split(/[?#]/)[0] || "/";
  const query = raw.includes("?") ? raw.slice(raw.indexOf("?")) : "";
  const hash = raw.includes("#") ? raw.slice(raw.indexOf("#")) : "";

  const legacy = LEGACY_EXACT[pathOnly];
  if (legacy) return `${legacy}${query}${hash}`;

  const categoryMatch = pathOnly.match(/^\/category\/([^/]+)\/?$/i);
  if (categoryMatch?.[1]) {
    return `${categoryShopHref(decodeURIComponent(categoryMatch[1]))}${query}${hash}`;
  }

  // Single segment that isn't a real app route → treat as category slug.
  const bare = pathOnly.match(/^\/([A-Za-z0-9][A-Za-z0-9_-]*)\/?$/);
  if (bare?.[1] && !KNOWN_TOP_SEGMENTS.has(bare[1].toLowerCase())) {
    return `${categoryShopHref(bare[1])}${query}${hash}`;
  }

  return raw;
}

/** Resolve storefront / dashboard hrefs. Role suffixes are ignored — always plain login. */
export function resolveStorefrontHref(href: string): {
  href: string;
  external: boolean;
} {
  if (href === "dashboard" || href.startsWith("dashboard:")) {
    return { href: dashboardLoginUrl(), external: true };
  }
  if (/^https?:\/\//i.test(href)) {
    return { href, external: true };
  }
  return { href: normalizeStorefrontPath(href), external: false };
}
