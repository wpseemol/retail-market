"use client";

import { useEffect, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { fetchPriceRange, type PriceRange } from "@/lib/products";

type Filters = {
    q: string;
    category: string | null;
    brands: string[];
};

type State = { key: string; range: PriceRange };

function filtersKey(q: string, category: string | null, brands: string[]) {
    return JSON.stringify([q, category ?? "", [...brands].sort()]);
}

/**
 * Price slider bounds from `GET /api/products/price-range` for the current shop filters.
 * `initial` is the SSR range for the first render's filters, so no request is made until they change.
 */
export function usePriceRange(filters: Filters, initial: PriceRange) {
    const q = useDebouncedValue(filters.q.trim(), 300);
    const key = filtersKey(q, filters.category, filters.brands);
    const [initialKey] = useState(key);
    const [state, setState] = useState<State | null>(null);

    useEffect(() => {
        if (key === initialKey) return;
        let cancelled = false;
        fetchPriceRange({
            q,
            category: filters.category,
            brands: filters.brands,
        })
            .then((range) => {
                if (!cancelled) setState({ key, range });
            })
            .catch(() => {
                // Keep the last known bounds if the request fails.
            });
        return () => {
            cancelled = true;
        };
        // q / category / brands are all encoded in key
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, initialKey]);

    if (key === initialKey) return { range: initial, loading: false };
    if (state?.key === key) return { range: state.range, loading: false };
    return { range: state?.range ?? initial, loading: true };
}
