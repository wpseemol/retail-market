/** Cached catalog document stored in IndexedDB via RxDB. */
export type CatalogCacheDoc = {
  id: string;
  updatedAt: number;
  /** JSON-stringified API payload (avoids nested schema churn). */
  payload: string;
};

export const STALE_MS = {
  /** Products, categories, brands, shops, home, site settings. */
  catalog: 90_000,
  /** Search suggest / price-range. */
  search: 20_000,
} as const;

export type StaleMs = (typeof STALE_MS)[keyof typeof STALE_MS];
