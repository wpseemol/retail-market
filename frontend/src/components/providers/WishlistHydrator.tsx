"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAppDispatch } from "@/store/hooks";
import { clearWishlist, setWishlistIds } from "@/store/wishlistSlice";
import {
    addToWishlistApi,
    fetchWishlistIds,
    takePendingWishlist,
    toIdList,
} from "@/lib/wishlist";

/** Loads the customer's wishlist ids after sign-in and finishes a "save before login" action. */
export default function WishlistHydrator() {
    const dispatch = useAppDispatch();
    const { status, data } = useSession();
    const userId = data?.backendUser?.id;

    useEffect(() => {
        if (status === "loading") return;
        if (status !== "authenticated" || !userId) {
            dispatch(clearWishlist());
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const pending = takePendingWishlist();
                const response = pending
                    ? await addToWishlistApi(pending).catch(() => fetchWishlistIds())
                    : await fetchWishlistIds();
                if (!cancelled) dispatch(setWishlistIds(toIdList(response)));
            } catch {
                if (!cancelled) dispatch(setWishlistIds([]));
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [dispatch, status, userId]);

    return null;
}
