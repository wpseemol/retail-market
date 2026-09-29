import { apiFetch } from "@/lib/api";

export type WishlistIdsResponse = { product_ids: string[]; count: number };

/** Product a guest tried to save before logging in — added automatically after sign-in. */
const PENDING_KEY = "niyenin:pending-wishlist";

export function toIdList(response: WishlistIdsResponse) {
    return response.product_ids.map(Number).filter(Number.isFinite);
}

export function fetchWishlistIds() {
    return apiFetch<WishlistIdsResponse>("/api/customer/wishlist/ids");
}

export function addToWishlistApi(productId: number) {
    return apiFetch<WishlistIdsResponse>("/api/customer/wishlist", {
        body: { product_id: String(productId) },
    });
}

export function removeFromWishlistApi(productId: number) {
    return apiFetch<WishlistIdsResponse>(`/api/customer/wishlist/${productId}`, {
        method: "DELETE",
    });
}

export function savePendingWishlist(productId: number) {
    try {
        sessionStorage.setItem(PENDING_KEY, String(productId));
    } catch {
        /* storage unavailable — user just re-clicks after login */
    }
}

export function takePendingWishlist(): number | null {
    try {
        const raw = sessionStorage.getItem(PENDING_KEY);
        sessionStorage.removeItem(PENDING_KEY);
        const id = raw ? Number(raw) : NaN;
        return Number.isInteger(id) && id > 0 ? id : null;
    } catch {
        return null;
    }
}
