import { configureStore } from "@reduxjs/toolkit";
import cartReducer from "./cartSlice";
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

export type StorePreload = {
    siteChrome?: SiteChromeHydratePayload | null;
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
        },
    });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
