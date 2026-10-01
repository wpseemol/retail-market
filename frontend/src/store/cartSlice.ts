import {
    createAsyncThunk,
    createSelector,
    createSlice,
    isFulfilled,
    isPending,
    isRejected,
    type PayloadAction,
} from "@reduxjs/toolkit";
import { ApiError } from "@/lib/api";
import {
    addCartItemApi,
    type CartMode,
    fetchCartApi,
    mergeGuestCartIntoAccount,
    removeCartLinesApi,
    selectCartLinesApi,
    updateCartLineApi,
} from "@/lib/cart";
import { type CartDto, type CartLine, MAX_LINE_QUANTITY } from "@/lib/cartTypes";
import type { ShopProduct } from "@/components/shop/types";

export type { CartLine } from "@/lib/cartTypes";

export interface CartState {
    items: CartLine[];
    mode: CartMode;
    loaded: boolean;
    /** Only the newest mutation's response is applied, so quick clicks can't roll each other back. */
    latestRequestId: string | null;
    error: string | null;
    couponCode: string | null;
    couponDiscount: number;
}

const initialState: CartState = {
    items: [],
    mode: "guest",
    loaded: false,
    latestRequestId: null,
    error: null,
    couponCode: null,
    couponDiscount: 0,
};

type ThunkApi = { state: { cart: CartState }; rejectValue: string };

function errorMessage(err: unknown, fallback: string) {
    return err instanceof ApiError || err instanceof Error ? err.message : fallback;
}

/** Display data used for the optimistic line until the server responds. */
export type CartProductSnapshot = {
    name: string;
    slug?: string;
    image: string;
    alt?: string;
    price: number;
    stock?: number;
};

export const fetchCart = createAsyncThunk<CartDto, void, ThunkApi>(
    "cart/fetch",
    async (_, { getState, rejectWithValue }) => {
        try {
            return await fetchCartApi(getState().cart.mode);
        } catch (err) {
            return rejectWithValue(errorMessage(err, "Could not load your cart"));
        }
    },
);

/** Called once the session is known. Signing in merges the guest cart into the account. */
export const syncCartForSession = createAsyncThunk<CartDto, CartMode, ThunkApi>(
    "cart/syncForSession",
    async (mode, { rejectWithValue }) => {
        try {
            return mode === "user" ? await mergeGuestCartIntoAccount() : await fetchCartApi("guest");
        } catch (err) {
            return rejectWithValue(errorMessage(err, "Could not load your cart"));
        }
    },
);

/** A failed mutation re-fetches the cart so the optimistic change is rolled back. */
function cartMutation<Arg>(
    type: string,
    fallback: string,
    call: (mode: CartMode, arg: Arg) => Promise<CartDto>,
) {
    return createAsyncThunk<CartDto, Arg, ThunkApi>(
        type,
        async (arg, { getState, dispatch, rejectWithValue }) => {
            try {
                return await call(getState().cart.mode, arg);
            } catch (err) {
                void dispatch(fetchCart());
                return rejectWithValue(errorMessage(err, fallback));
            }
        },
    );
}

export const addCartItem = cartMutation<{
    productId: string | number;
    quantity?: number;
    product: CartProductSnapshot;
}>("cart/add", "Could not add to cart", (mode, { productId, quantity = 1 }) =>
    addCartItemApi(mode, String(productId), quantity),
);

export const setLineQuantity = cartMutation<{ productId: string; quantity: number }>(
    "cart/setQuantity",
    "Could not update quantity",
    (mode, { productId, quantity }) => updateCartLineApi(mode, productId, { quantity }),
);

export const setLineSelected = cartMutation<{ productId: string; selected: boolean }>(
    "cart/setSelected",
    "Could not update selection",
    (mode, { productId, selected }) => updateCartLineApi(mode, productId, { selected }),
);

/** Select / unselect every line, or only `productIds` (e.g. "Buy now" selects just one product). */
export const setLinesSelected = cartMutation<{ selected: boolean; productIds?: string[] }>(
    "cart/setAllSelected",
    "Could not update selection",
    (mode, { selected, productIds }) => selectCartLinesApi(mode, selected, productIds),
);

export const removeCartLines = cartMutation<string[]>(
    "cart/remove",
    "Could not remove item",
    (mode, productIds) => removeCartLinesApi(mode, productIds),
);

/**
 * After an order: signed-in carts were already cleaned by the order endpoint,
 * guest carts drop the ordered products from the cookie.
 */
export const removeOrderedLines = cartMutation<string[]>(
    "cart/removeOrdered",
    "Could not refresh your cart",
    (mode, productIds) =>
        mode === "guest" ? removeCartLinesApi("guest", productIds) : fetchCartApi("user"),
);

export function cartSnapshot(product: ShopProduct): CartProductSnapshot {
    return {
        name: product.name,
        slug: product.slug,
        image: product.image,
        alt: product.alt,
        price: product.priceMin,
        stock: product.available,
    };
}

/**
 * "Buy now": puts the product in the cart (exact quantity when `exact`), then
 * selects only that product so checkout shows just it. Other lines stay in the cart.
 */
export const buyNow = createAsyncThunk<
    void,
    { productId: string | number; quantity: number; exact?: boolean; product: CartProductSnapshot },
    ThunkApi
>("cart/buyNow", async ({ productId, quantity, exact, product }, { dispatch, getState, rejectWithValue }) => {
    const id = String(productId);
    const inCart = getState().cart.items.some((l) => l.product_id === id);
    const placed = inCart
        ? exact
            ? await dispatch(setLineQuantity({ productId: id, quantity }))
            : null
        : await dispatch(addCartItem({ productId: id, quantity, product }));
    if (placed?.meta.requestStatus === "rejected") {
        return rejectWithValue((placed.payload as string | undefined) ?? "Could not add to cart");
    }
    await dispatch(setLinesSelected({ selected: false }));
    await dispatch(setLinesSelected({ selected: true, productIds: [id] }));
});

const mutations = [
    addCartItem,
    setLineQuantity,
    setLineSelected,
    setLinesSelected,
    removeCartLines,
    removeOrderedLines,
] as const;

function lineTotal(line: CartLine) {
    return Math.round(line.unit_price * line.quantity * 100) / 100;
}

const cartSlice = createSlice({
    name: "cart",
    initialState,
    reducers: {
        setCartMode(state, action: PayloadAction<CartMode>) {
            state.mode = action.payload;
        },
        clearCartError(state) {
            state.error = null;
        },
        applyCoupon(state, action: PayloadAction<string>) {
            const code = action.payload.trim().toUpperCase();
            if (code === "SAVE10") {
                state.couponCode = code;
                state.couponDiscount = 0.1;
                return;
            }
            if (code === "SAVE20") {
                state.couponCode = code;
                state.couponDiscount = 0.2;
                return;
            }
            state.couponCode = null;
            state.couponDiscount = 0;
        },
        clearCoupon(state) {
            state.couponCode = null;
            state.couponDiscount = 0;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(syncCartForSession.pending, (state, action) => {
                state.mode = action.meta.arg;
                state.latestRequestId = action.meta.requestId;
            })
            .addCase(syncCartForSession.fulfilled, (state, action) => {
                state.loaded = true;
                if (state.latestRequestId !== action.meta.requestId) return;
                state.items = action.payload.items;
            })
            .addCase(syncCartForSession.rejected, (state, action) => {
                state.loaded = true;
                state.error = action.payload ?? null;
            })
            .addCase(fetchCart.pending, (state, action) => {
                state.latestRequestId = action.meta.requestId;
            })
            .addCase(fetchCart.fulfilled, (state, action) => {
                state.loaded = true;
                if (state.latestRequestId !== action.meta.requestId) return;
                state.items = action.payload.items;
            })
            .addCase(fetchCart.rejected, (state) => {
                state.loaded = true;
            });

        // Optimistic updates so the UI responds instantly.
        builder
            .addCase(addCartItem.pending, (state, action) => {
                const { productId, quantity = 1, product } = action.meta.arg;
                const id = String(productId);
                const existing = state.items.find((l) => l.product_id === id);
                if (existing) {
                    existing.quantity = Math.min(MAX_LINE_QUANTITY, existing.quantity + quantity);
                    existing.line_total = lineTotal(existing);
                    return;
                }
                const line: CartLine = {
                    product_id: id,
                    variant_id: null,
                    name: product.name,
                    slug: product.slug ?? id,
                    image: product.image,
                    alt: product.alt ?? product.name,
                    unit_price: product.price,
                    compare_at_price: null,
                    stock_qty: product.stock ?? MAX_LINE_QUANTITY,
                    available: true,
                    quantity: Math.min(MAX_LINE_QUANTITY, quantity),
                    selected: true,
                    line_total: 0,
                };
                line.line_total = lineTotal(line);
                state.items.unshift(line);
            })
            .addCase(setLineQuantity.pending, (state, action) => {
                const line = state.items.find((l) => l.product_id === action.meta.arg.productId);
                if (!line) return;
                line.quantity = action.meta.arg.quantity;
                line.line_total = lineTotal(line);
            })
            .addCase(setLineSelected.pending, (state, action) => {
                const line = state.items.find((l) => l.product_id === action.meta.arg.productId);
                if (line) line.selected = action.meta.arg.selected;
            })
            .addCase(setLinesSelected.pending, (state, action) => {
                const ids = action.meta.arg.productIds ? new Set(action.meta.arg.productIds) : null;
                for (const line of state.items) {
                    if (!ids || ids.has(line.product_id)) line.selected = action.meta.arg.selected;
                }
            })
            .addCase(removeCartLines.pending, (state, action) => {
                const ids = new Set(action.meta.arg);
                state.items = state.items.filter((l) => !ids.has(l.product_id));
            })
            .addCase(removeOrderedLines.pending, (state, action) => {
                const ids = new Set(action.meta.arg);
                state.items = state.items.filter((l) => !ids.has(l.product_id));
            });

        builder
            .addMatcher(isPending(...mutations), (state, action) => {
                state.latestRequestId = action.meta.requestId;
                state.error = null;
            })
            .addMatcher(isFulfilled(...mutations), (state, action) => {
                if (state.latestRequestId !== action.meta.requestId) return;
                state.items = action.payload.items;
            })
            .addMatcher(isRejected(...mutations), (state, action) => {
                state.error = (action.payload as string | undefined) ?? "Something went wrong";
            });
    },
});

export const { setCartMode, clearCartError, applyCoupon, clearCoupon } = cartSlice.actions;

export default cartSlice.reducer;

type CartRoot = { cart: CartState };

export function selectCartItems(state: CartRoot) {
    return state.cart.items;
}

export function selectCartLoaded(state: CartRoot) {
    return state.cart.loaded;
}

export function selectCartError(state: CartRoot) {
    return state.cart.error;
}

/** Sum of quantities across all lines (header badge). */
export function selectCartItemCount(state: CartRoot) {
    return state.cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

/** Value of everything in the cart (header). */
export function selectCartSubtotal(state: CartRoot) {
    return state.cart.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
}

/** Lines that go to checkout: ticked and in stock. */
export const selectCheckoutItems = createSelector([selectCartItems], (items) =>
    items.filter((item) => item.selected && item.available),
);

export function selectCheckoutSubtotal(state: CartRoot) {
    return selectCheckoutItems(state).reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0,
    );
}

export function selectCheckoutDiscount(state: CartRoot) {
    return selectCheckoutSubtotal(state) * state.cart.couponDiscount;
}

export function selectCheckoutTotal(state: CartRoot) {
    return selectCheckoutSubtotal(state) - selectCheckoutDiscount(state);
}

export function selectCouponCode(state: CartRoot) {
    return state.cart.couponCode;
}
