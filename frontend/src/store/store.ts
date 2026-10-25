import { configureStore } from "@reduxjs/toolkit";
import cartReducer from "./cartSlice";
import authReducer from "./authSlice";
import siteChromeReducer from "./siteChromeSlice";
import wishlistReducer from "./wishlistSlice";
import connectionReducer from "./connectionSlice";

export const makeStore = () =>
    configureStore({
        reducer: {
            cart: cartReducer,
            auth: authReducer,
            siteChrome: siteChromeReducer,
            wishlist: wishlistReducer,
            connection: connectionReducer,
        },
    });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
