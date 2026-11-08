"use client";

import { useState } from "react";
import { Provider } from "react-redux";
import { makeStore, type StorePreload } from "@/store/store";
import type { SiteChromeHydratePayload } from "@/store/siteChromeSlice";
import type { ApiUser } from "@/lib/api";
import type { CartUiSnapshot } from "@/lib/cartUiCookie";

export default function StoreProvider({
    children,
    siteChrome,
    authUser = null,
    authReady = false,
    cartUi = null,
}: {
    children: React.ReactNode;
    /** Server chrome so header/footer match SSR and skip the empty-Redux flash. */
    siteChrome?: SiteChromeHydratePayload | null;
    /** Public profile from Auth.js cookie — header account menu on first paint. */
    authUser?: ApiUser | null;
    /** Server already resolved session (avoids account skeleton on reload). */
    authReady?: boolean;
    /** Cart count/total cookie — header badge without waiting for API. */
    cartUi?: CartUiSnapshot | null;
}) {
    const [store] = useState(() => {
        const preload: StorePreload = {
            siteChrome: siteChrome ?? null,
            authUser,
            authReady,
            cartUi,
        };
        return makeStore(preload);
    });

    return <Provider store={store}>{children}</Provider>;
}
