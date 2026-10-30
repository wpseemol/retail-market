"use client";

import { useRef } from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore, type StorePreload } from "@/store/store";
import type { SiteChromeHydratePayload } from "@/store/siteChromeSlice";

export default function StoreProvider({
    children,
    siteChrome,
}: {
    children: React.ReactNode;
    /** Server chrome so header/footer match SSR and skip the empty-Redux flash. */
    siteChrome?: SiteChromeHydratePayload | null;
}) {
    const storeRef = useRef<AppStore | null>(null);
    if (!storeRef.current) {
        const preload: StorePreload = { siteChrome: siteChrome ?? null };
        storeRef.current = makeStore(preload);
    }

    return <Provider store={storeRef.current}>{children}</Provider>;
}
