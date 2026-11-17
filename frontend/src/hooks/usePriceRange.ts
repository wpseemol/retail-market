"use client";

import { useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useRxCatalog } from "@/hooks/useRxCatalog";
import {
  fetchPriceRange,
  type PriceRange,
} from "@/lib/products";
import { hashQuery, queryCacheId, STALE_MS } from "@/lib/rxdb/withCache";

type Filters = {
  q: string;
  category: string | null;
  brands: string[];
};

function filtersKey(q: string, category: string | null, brands: string[]) {
  return JSON.stringify([q, category ?? "", [...brands].sort()]);
}

/**
 * Price slider bounds from `GET /api/products/price-range` for the current shop filters.
 * `initial` is the SSR range for the first render's filters, so no request is made until they change.
 * Live-updates via RxDB when a background refresh upserts the same cache id.
 */
export function usePriceRange(filters: Filters, initial: PriceRange) {
  const q = useDebouncedValue(filters.q.trim(), 300);
  const key = filtersKey(q, filters.category, filters.brands);
  const [initialKey] = useState(key);
  const needsFetch = key !== initialKey;

  const cacheId = queryCacheId(
    "products:price-range",
    hashQuery({
      q,
      category: filters.category,
      brands: filters.brands.join(","),
    }),
  );

  const { data, loading } = useRxCatalog<PriceRange>(
    needsFetch ? cacheId : null,
    () =>
      fetchPriceRange({
        q,
        category: filters.category,
        brands: filters.brands,
      }),
    { staleMs: STALE_MS.search, enabled: needsFetch },
  );

  if (!needsFetch) {
    return { range: initial, loading: false };
  }
  return { range: data ?? initial, loading };
}
