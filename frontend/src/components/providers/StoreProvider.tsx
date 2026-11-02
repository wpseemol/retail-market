"use client";

import { useState } from "react";
import { Provider } from "react-redux";
import { makeStore, type StorePreload } from "@/store/store";
import type { SiteChromeHydratePayload } from "@/store/siteChromeSlice";

export default function StoreProvider({
    children,
    siteChrome,
}: {
    children: React.ReactNode;
    /** Server chrome so header/footer match SSR and skip the empty-Redux flash. */
    siteChrome?: SiteChromeHydratePayload | null;
}) {
    const [store] = useState(() => {
        const preload: StorePreload = { siteChrome: siteChrome ?? null };
        return makeStore(preload);
    });

    return <Provider store={store}>{children}</Provider>;
}
