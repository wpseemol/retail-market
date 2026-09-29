"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ApiError } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
    addWishlistId,
    removeWishlistId,
    selectWishlistIds,
    setWishlistIds,
} from "@/store/wishlistSlice";
import {
    addToWishlistApi,
    removeFromWishlistApi,
    savePendingWishlist,
    toIdList,
} from "@/lib/wishlist";

/**
 * Wishlist is account-only. Guests are sent to /login (then back here) and the
 * product they clicked is saved automatically after sign-in.
 */
export function useWishlist() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const pathname = usePathname();
    const { status } = useSession();
    const ids = useAppSelector(selectWishlistIds);
    const [pendingIds, setPendingIds] = useState<number[]>([]);
    const [error, setError] = useState<string | null>(null);

    const isWishlisted = useCallback((productId: number) => ids.includes(productId), [ids]);
    const isPending = useCallback(
        (productId: number) => pendingIds.includes(productId),
        [pendingIds],
    );

    const toggle = useCallback(
        async (productId: number) => {
            setError(null);
            if (status === "loading") return;
            if (status !== "authenticated") {
                savePendingWishlist(productId);
                const here = `${pathname}${window.location.search}`;
                router.push(`/login?next=${encodeURIComponent(here)}`);
                return;
            }
            if (pendingIds.includes(productId)) return;

            const wasSaved = ids.includes(productId);
            dispatch(wasSaved ? removeWishlistId(productId) : addWishlistId(productId));
            setPendingIds((prev) => [...prev, productId]);
            try {
                const response = wasSaved
                    ? await removeFromWishlistApi(productId)
                    : await addToWishlistApi(productId);
                dispatch(setWishlistIds(toIdList(response)));
            } catch (err) {
                dispatch(wasSaved ? addWishlistId(productId) : removeWishlistId(productId));
                if (err instanceof ApiError && err.status === 401) {
                    savePendingWishlist(productId);
                    router.push(`/login?next=${encodeURIComponent(pathname)}`);
                    return;
                }
                setError(
                    err instanceof ApiError ? err.message : "Could not update your wishlist.",
                );
            } finally {
                setPendingIds((prev) => prev.filter((id) => id !== productId));
            }
        },
        [dispatch, ids, pathname, pendingIds, router, status],
    );

    return { ids, isWishlisted, isPending, toggle, error, isLoggedIn: status === "authenticated" };
}
