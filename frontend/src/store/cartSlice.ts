import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface CartItem {
    id: number;
    name: string;
    image: string;
    alt: string;
    price: number;
    quantity: number;
}

export interface CartState {
    items: CartItem[];
    couponCode: string | null;
    couponDiscount: number;
}

const DEMO_CART_ITEMS: CartItem[] = [
    {
        id: 101,
        name: 'Fire HD 10 tablet, 10.1", 1080p Full HD',
        image: "/images/best_seller_product (1).png",
        alt: "Fire HD 10 tablet",
        price: 3662,
        quantity: 2,
    },
    {
        id: 102,
        name: "Toaster 2 Slice Stainless Steel Extra Wide Slot",
        image: "/images/best_seller_product (2).png",
        alt: "Toaster 2 Slice Stainless Steel",
        price: 3662,
        quantity: 1,
    },
    {
        id: 103,
        name: "HP M32f 32 Inch FHD LED Black Monitor",
        image: "/images/best_seller_product (3).png",
        alt: "HP M32f 32 Inch FHD LED Monitor",
        price: 3662,
        quantity: 3,
    },
];

const initialState: CartState = {
    items: DEMO_CART_ITEMS,
    couponCode: null,
    couponDiscount: 0,
};

export type AddToCartPayload = Omit<CartItem, "quantity"> & {
    quantity?: number;
};

const cartSlice = createSlice({
    name: "cart",
    initialState,
    reducers: {
        addToCart(state, action: PayloadAction<AddToCartPayload>) {
            const qty = Math.max(1, action.payload.quantity ?? 1);
            const existing = state.items.find(
                (item) => item.id === action.payload.id,
            );
            if (existing) {
                existing.quantity = Math.min(99, existing.quantity + qty);
                return;
            }
            state.items.push({
                id: action.payload.id,
                name: action.payload.name,
                image: action.payload.image,
                alt: action.payload.alt,
                price: action.payload.price,
                quantity: Math.min(99, qty),
            });
        },
        removeFromCart(state, action: PayloadAction<number>) {
            state.items = state.items.filter(
                (item) => item.id !== action.payload,
            );
        },
        updateQuantity(
            state,
            action: PayloadAction<{ id: number; quantity: number }>,
        ) {
            const item = state.items.find((i) => i.id === action.payload.id);
            if (!item) return;
            const next = Math.floor(action.payload.quantity);
            if (next < 1) {
                state.items = state.items.filter(
                    (i) => i.id !== action.payload.id,
                );
                return;
            }
            item.quantity = Math.min(99, next);
        },
        incrementQuantity(state, action: PayloadAction<number>) {
            const item = state.items.find((i) => i.id === action.payload);
            if (!item) return;
            item.quantity = Math.min(99, item.quantity + 1);
        },
        decrementQuantity(state, action: PayloadAction<number>) {
            const item = state.items.find((i) => i.id === action.payload);
            if (!item) return;
            if (item.quantity <= 1) {
                state.items = state.items.filter(
                    (i) => i.id !== action.payload,
                );
                return;
            }
            item.quantity -= 1;
        },
        clearCart(state) {
            state.items = [];
            state.couponCode = null;
            state.couponDiscount = 0;
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
});

export const {
    addToCart,
    removeFromCart,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    clearCart,
    applyCoupon,
    clearCoupon,
} = cartSlice.actions;

export default cartSlice.reducer;

export function selectCartItems(state: { cart: CartState }) {
    return state.cart.items;
}

export function selectCartItemCount(state: { cart: CartState }) {
    return state.cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function selectCartSubtotal(state: { cart: CartState }) {
    return state.cart.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
    );
}

export function selectCartDiscount(state: { cart: CartState }) {
    const subtotal = selectCartSubtotal(state);
    return subtotal * state.cart.couponDiscount;
}

export function selectCartTotal(state: { cart: CartState }) {
    return selectCartSubtotal(state) - selectCartDiscount(state);
}

export function selectCouponCode(state: { cart: CartState }) {
    return state.cart.couponCode;
}
