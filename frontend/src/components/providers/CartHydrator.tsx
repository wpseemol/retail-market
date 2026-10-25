"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAppDispatch, useAppSelector, useAppStore } from "@/store/hooks";
import { readCartCache } from "@/store/cartCache";
import { selectOnline } from "@/store/connectionSlice";
import { flushOfflineCart, hydrateCartCache, syncCartForSession } from "@/store/cartSlice";

/**
 * Guests use the encrypted cookie cart. On sign-in the guest cart is merged
 * into the account cart (quantities add up) and the cookie is cleared.
 * Offline, the last cart stays on this device and queued edits sync on reconnect.
 */
export default function CartHydrator() {
    const dispatch = useAppDispatch();
    const store = useAppStore();
    const online = useAppSelector(selectOnline);
    const { status, data } = useSession();
    const userId = data?.backendUser?.id;
    const isCustomer = data?.backendUser?.role === "customer";

    useEffect(() => {
        if (status === "loading") return;

        if (!online) {
            dispatch(hydrateCartCache(readCartCache()));
            return;
        }

        let cancelled = false;
        void (async () => {
            if (store.getState().cart.offlineOps.length > 0) {
                const flushed = await dispatch(flushOfflineCart());
                if (cancelled || flushOfflineCart.rejected.match(flushed)) return;
            }
            const mode =
                status === "authenticated" && userId && isCustomer && !data?.error
                    ? "user"
                    : "guest";
            if (!cancelled) void dispatch(syncCartForSession(mode));
        })();

        return () => {
            cancelled = true;
        };
    }, [dispatch, store, online, status, userId, isCustomer, data?.error]);

    return null;
}
