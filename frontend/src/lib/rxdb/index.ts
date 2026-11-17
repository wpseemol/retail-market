/**
 * Public storefront cache surface. Prefer these imports over `./database` / `./sync`
 * so server modules do not pull Dexie into the SSR graph accidentally.
 */
export {
  withCatalogCache,
  seedCatalogCache,
  subscribeCatalogCache,
  hashQuery,
  queryCacheId,
  STALE_MS,
} from "./withCache";
export type { CatalogCacheDoc, StaleMs } from "./types";
