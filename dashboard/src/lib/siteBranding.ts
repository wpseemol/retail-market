import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type PublicBranding = {
  favicon?: { path: string } | null;
  login_logo?: { path: string } | null;
  site_name?: string;
};

const FALLBACK_FAVICON = "/logo/niyenin-dark.png";
const FALLBACK_LOGIN_LOGO = "/logo/niyenin-white.png";

export { FALLBACK_FAVICON, FALLBACK_LOGIN_LOGO };

let brandingCache: PublicBranding | null = null;
let brandingPromise: Promise<PublicBranding> | null = null;

async function fetchPublicBranding(): Promise<PublicBranding> {
  if (brandingCache) return brandingCache;
  if (!brandingPromise) {
    brandingPromise = apiFetch<{ settings?: PublicBranding }>(
      "/api/site-settings",
      { skipRefresh: true },
    )
      .then((data) => {
        brandingCache = data.settings ?? {};
        return brandingCache;
      })
      .catch(() => {
        brandingCache = {};
        return brandingCache;
      })
      .finally(() => {
        brandingPromise = null;
      });
  }
  return brandingPromise;
}

/** Apply favicon from public site settings (falls back to static logo). */
export function applyFaviconHref(href: string) {
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = href;
}

export function SiteBrandingHydrator() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const settings = await fetchPublicBranding();
      if (cancelled) return;
      applyFaviconHref(settings.favicon?.path || FALLBACK_FAVICON);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

/** Login page branding (logo + site name) from public site settings. */
export function useLoginBranding() {
  const [logoUrl, setLogoUrl] = useState(FALLBACK_LOGIN_LOGO);
  const [siteName, setSiteName] = useState("Niyenin");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const settings = await fetchPublicBranding();
      if (cancelled) return;
      if (settings.login_logo?.path) setLogoUrl(settings.login_logo.path);
      if (settings.site_name?.trim()) setSiteName(settings.site_name.trim());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { logoUrl, siteName };
}

/** Clear cached branding after dashboard uploads so the next load refetches. */
export function invalidateSiteBrandingCache() {
  brandingCache = null;
}
