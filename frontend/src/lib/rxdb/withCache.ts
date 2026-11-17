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

/** Write a known-good SSR payload into IndexedDB so the next client read hits locally. */
export async function seedCatalogCache<T>(id: string, data: T): Promise<void> {
  if (typeof window === "undefined") return;
  const { seedCatalogCache: seed } = await import("./sync");
  return seed(id, data);
}

/** Live-update when a background SWR upserts the same cache id. */
export async function subscribeCatalogCache<T>(
  id: string,
  onChange: (data: T | null) => void,
): Promise<() => void> {
  if (typeof window === "undefined") {
    onChange(null);
    return () => undefined;
  }
  const { subscribeCacheDoc } = await import("./sync");
  return subscribeCacheDoc(id, onChange);
}

export { hashQuery, queryCacheId, STALE_MS };
export type { StaleMs };
