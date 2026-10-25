"use client";

import { useEffect } from "react";

/** Saves pages you open so the same address can load again without a network. */
export default function OfflineCache() {
    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;
        let cancelled = false;
        navigator.serviceWorker
            .register("/sw.js", { scope: "/" })
            .then(() => navigator.serviceWorker.ready)
            .then((registration) => {
                if (cancelled) return;
                const locale = document.cookie.match(/(?:^|; )NEXT_LOCALE=(bn|en)/)?.[1] ?? "en";
                registration.active?.postMessage({ type: "locale", locale });
                void fetch("/offline").catch(() => undefined);
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, []);

    return null;
}
