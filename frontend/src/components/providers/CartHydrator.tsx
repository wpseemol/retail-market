"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAppDispatch } from "@/store/hooks";
import { syncCartForSession } from "@/store/cartSlice";

/**
 * Guests use the encrypted cookie cart. On sign-in the guest cart is merged
 * into the account cart (quantities add up) and the cookie is cleared.
 */
export default function CartHydrator() {
    const dispatch = useAppDispatch();
    const { status, data } = useSession();
    const userId = data?.backendUser?.id;
    const isCustomer = data?.backendUser?.role === "customer";

    useEffect(() => {
        if (status === "loading") return;
        const mode = status === "authenticated" && userId && isCustomer ? "user" : "guest";
        const pending = dispatch(syncCartForSession(mode));
        return () => pending.abort();
    }, [dispatch, status, userId, isCustomer]);

    return null;
}
