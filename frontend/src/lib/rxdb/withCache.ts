import { hashQuery, queryCacheId } from "./hash";
import type { StaleMs } from "./types";
import { STALE_MS } from "./types";

/**
 * Apply RxDB read-through only in the browser.
 * Safe to call from shared SSR/client fetch helpers (dynamic import of Dexie).
 */
export async function withCatalogCache<T>(
  id: string,
  fetcher: () => Promise<T>,
  staleMs: StaleMs = STALE_MS.catalog,
): Promise<T> {
  if (typeof window === "undefined") {
    return fetcher();
  }
  const { readThrough } = await import("./sync");
  return readThrough(id, fetcher, staleMs);
}

export { hashQuery, queryCacheId, STALE_MS };
export type { StaleMs };
