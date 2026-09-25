import {
  dashboardLoginUrl,
  type DashboardLoginRole,
} from "@/config/site";

/** Resolve storefront / dashboard:role hrefs. */
export function resolveStorefrontHref(href: string): {
  href: string;
  external: boolean;
} {
  if (href.startsWith("dashboard:")) {
    const role = href.slice("dashboard:".length) as DashboardLoginRole;
    return { href: dashboardLoginUrl(role), external: true };
  }
  if (/^https?:\/\//i.test(href)) {
    return { href, external: true };
  }
  return { href, external: false };
}
