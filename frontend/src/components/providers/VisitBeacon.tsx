"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { API_URL } from "@/lib/api";

/**
 * Sends a lightweight storefront page-view beacon for visitor-by-country analytics.
 */
export function VisitBeacon() {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastSent.current === pathname) return;
    lastSent.current = pathname;

    const body = JSON.stringify({
      path: pathname.slice(0, 255),
      referrer:
        typeof document !== "undefined" ? document.referrer.slice(0, 500) : "",
    });

    const url = `${API_URL}/api/analytics/visit`;
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon(url, blob);
        return;
      }
    } catch {
      /* fall through */
    }

    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
