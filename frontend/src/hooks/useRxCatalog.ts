"use client";

import { useEffect, useState } from "react";
import {
  readThrough,
  subscribeCacheDoc,
  type StaleMs,
  STALE_MS,
} from "@/lib/rxdb";

/**
 * Local-first catalog read: seed from IndexedDB (or network), then live-update
 * when a background refresh upserts the same cache id.
 */
export function useRxCatalog<T>(
  id: string | null,
  fetcher: () => Promise<T>,
  options?: { staleMs?: StaleMs; enabled?: boolean },
): { data: T | null; loading: boolean; error: string | null } {
  const enabled = options?.enabled !== false && Boolean(id);
  const staleMs = options?.staleMs ?? STALE_MS.catalog;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !id) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let unsub: (() => void) | undefined;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const initial = await readThrough(id, fetcher, staleMs);
        if (!cancelled) {
          setData(initial);
          setLoading(false);
        }
        unsub = await subscribeCacheDoc<T>(id, (next) => {
          if (!cancelled && next != null) setData(next);
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      unsub?.();
    };
    // fetcher identity is caller-controlled via id + deps they pass by remounting.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- id/staleMs/enabled drive refresh
  }, [id, enabled, staleMs]);

  return { data, loading, error };
}
