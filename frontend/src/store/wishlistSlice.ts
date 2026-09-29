import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface WishlistState {
    /** Product ids in the signed-in customer's wishlist (newest first). */
    ids: number[];
    loaded: boolean;
}

const initialState: WishlistState = { ids: [], loaded: false };

const wishlistSlice = createSlice({
    name: "wishlist",
    initialState,
    reducers: {
        setWishlistIds(state, action: PayloadAction<number[]>) {
            state.ids = action.payload;
            state.loaded = true;
        },
        addWishlistId(state, action: PayloadAction<number>) {
            if (!state.ids.includes(action.payload)) state.ids.unshift(action.payload);
        },
        removeWishlistId(state, action: PayloadAction<number>) {
            state.ids = state.ids.filter((id) => id !== action.payload);
        },
        clearWishlist(state) {
            state.ids = [];
            state.loaded = false;
        },
    },
});

export const { setWishlistIds, addWishlistId, removeWishlistId, clearWishlist } =
    wishlistSlice.actions;

export default wishlistSlice.reducer;

export function selectWishlistIds(state: { wishlist: WishlistState }) {
    return state.wishlist.ids;
}

export function selectWishlistLoaded(state: { wishlist: WishlistState }) {
    return state.wishlist.loaded;
}

export function selectWishlistCount(state: { wishlist: WishlistState }) {
    return state.wishlist.ids.length;
}
