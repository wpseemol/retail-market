"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectOnline } from "@/store/connectionSlice";
import { clearWishlist, selectWishlistIds, selectWishlistLoaded, setWishlistIds } from "@/store/wishlistSlice";
import {
    addToWishlistApi,
    fetchWishlistIds,
    removeFromWishlistApi,
    takePendingWishlist,
    toIdList,
} from "@/lib/wishlist";
import {
    clearWishlistCache,
    clearWishlistQueue,
    readWishlistIds,
    readWishlistQueue,
    writeWishlistIds,
} from "@/store/wishlistCache";

/** Loads the customer's wishlist ids after sign-in and finishes a "save before login" action. */
export default function WishlistHydrator() {
    const dispatch = useAppDispatch();
    const { status, data } = useSession();
    const userId = data?.backendUser?.id;
    const online = useAppSelector(selectOnline);
    const ids = useAppSelector(selectWishlistIds);
    const loaded = useAppSelector(selectWishlistLoaded);

    useEffect(() => {
        if (status === "loading") return;
        if (status !== "authenticated") {
            clearWishlistCache();
            clearWishlistQueue();
            return;
        }
        if (loaded) writeWishlistIds(ids);
    }, [ids, loaded, status]);

    useEffect(() => {
        if (status === "loading") return;
        if (status !== "authenticated" || !userId || data?.error) {
            dispatch(clearWishlist());
            return;
        }

        if (!online) {
            dispatch(setWishlistIds(readWishlistIds()));
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const pending = takePendingWishlist();
                if (pending) {
                    await addToWishlistApi(pending).catch(() => fetchWishlistIds());
                }
                for (const change of readWishlistQueue()) {
                    if (change.action === "add") await addToWishlistApi(change.id);
                    else await removeFromWishlistApi(change.id);
                }
                clearWishlistQueue();
                const response = await fetchWishlistIds();
                if (!cancelled) dispatch(setWishlistIds(toIdList(response)));
            } catch {
                if (cancelled || !navigator.onLine) return;
                if (!cancelled) dispatch(setWishlistIds(readWishlistIds()));
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [dispatch, status, userId, data?.error, online]);

    return null;
}
