import { configureStore } from "@reduxjs/toolkit";
import cartReducer, { seedCartState } from "./cartSlice";
import authReducer from "./authSlice";
import siteChromeReducer, {
    applySiteChromePayload,
    initialSiteChromeState,
    type SiteChromeHydratePayload,
    type SiteChromeState,
} from "./siteChromeSlice";
import wishlistReducer from "./wishlistSlice";
import connectionReducer from "./connectionSlice";
import { readSiteChromeCache } from "./siteChromeCache";
import type { ApiUser } from "@/lib/api";
import type { CartUiSnapshot } from "@/lib/cartUiCookie";

export type StorePreload = {
    siteChrome?: SiteChromeHydratePayload | null;
    /** From Auth.js `auth()` in the root layout — skips the account-menu skeleton. */
    authUser?: ApiUser | null;
    /** True once the server has resolved the session (logged in or guest). */
    authReady?: boolean;
    /** Readable cart count/total cookie for the header on first paint. */
    cartUi?: CartUiSnapshot | null;
};

function seedSiteChrome(preload?: SiteChromeHydratePayload | null): SiteChromeState {
    if (preload) {
        return applySiteChromePayload(initialSiteChromeState, preload);
    }
    // Client-only fallback when the layout has not passed chrome yet.
    const cached = readSiteChromeCache();
    if (cached) return cached;
    return initialSiteChromeState;
}

export const makeStore = (preload?: StorePreload) =>
    configureStore({
        reducer: {
            cart: cartReducer,
            auth: authReducer,
            siteChrome: siteChromeReducer,
            wishlist: wishlistReducer,
            connection: connectionReducer,
        },
        preloadedState: {
            siteChrome: seedSiteChrome(preload?.siteChrome),
            auth: {
                user: preload?.authUser ?? null,
                hydrated: preload?.authReady === true,
            },
            cart: seedCartState(preload?.cartUi ?? null),
        },
    });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
