import { dashboardLoginUrl } from "@/config/site";

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
  return { href, external: false };
}
