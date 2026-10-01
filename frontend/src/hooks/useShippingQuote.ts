"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { CartLine } from "@/lib/cartTypes";

export type ShippingQuote = {
    shipping_fee: number;
    free_shipping_applied: boolean;
    default_fee: number;
    free_threshold: number | null;
    vendor_override: boolean;
};

type State = {
    key: string;
    quote: ShippingQuote | null;
    error: boolean;
};

/** Server-calculated shipping for the cart; the order endpoint uses the same rule. */
export function useShippingQuote(items: CartLine[]) {
    const payload = useMemo(
        () =>
            items.map((item) => ({
                product_id: item.product_id,
                unit_price: item.unit_price,
                quantity: item.quantity,
            })),
        [items],
    );
    const key = JSON.stringify(payload);
    const [state, setState] = useState<State>({
        key: "",
        quote: null,
        error: false,
    });

    useEffect(() => {
        if (payload.length === 0) return;
        let cancelled = false;
        apiFetch<ShippingQuote>("/api/customer/orders/shipping-quote", {
            method: "POST",
            body: { items: payload },
            skipRefresh: true,
        })
            .then((quote) => {
                if (!cancelled) setState({ key, quote, error: false });
            })
            .catch(() => {
                if (!cancelled) setState({ key, quote: null, error: true });
            });
        return () => {
            cancelled = true;
        };
        // payload is derived from key
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    if (payload.length === 0) {
        return { quote: null, fee: 0, loading: false, error: false };
    }
    const current = state.key === key;
    return {
        quote: current ? state.quote : null,
        fee: current && state.quote ? state.quote.shipping_fee : 0,
        loading: !current,
        error: current && state.error,
    };
}
