"use client";

import {
  createRxDatabase,
  type RxCollection,
  type RxDatabase,
  type RxJsonSchema,
} from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import type { CatalogCacheDoc } from "./types";

const DB_NAME = "niyenin_storefront_v1";

const catalogSchema: RxJsonSchema<CatalogCacheDoc> = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 280 },
    updatedAt: { type: "number", multipleOf: 1, minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
    payload: { type: "string", maxLength: 2_000_000 },
  },
  required: ["id", "updatedAt", "payload"],
};

type CatalogCollections = {
  catalog: RxCollection<CatalogCacheDoc>;
};

export type StorefrontDatabase = RxDatabase<CatalogCollections>;

let dbPromise: Promise<StorefrontDatabase> | null = null;

/** Browser-only RxDB (Dexie / IndexedDB). SSR must not call this. */
export function getStorefrontDb(): Promise<StorefrontDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("RxDB is browser-only"));
  }
  if (!dbPromise) {
    dbPromise = createRxDatabase<CatalogCollections>({
      name: DB_NAME,
      storage: getRxStorageDexie(),
      multiInstance: true,
      eventReduce: true,
      ignoreDuplicate: true,
    }).then(async (db) => {
      await db.addCollections({
        catalog: { schema: catalogSchema },
      });
      return db;
    });
  }
  return dbPromise;
}

/** Drop the in-memory promise (schema bump / tests). IndexedDB cleared via removeDatabase if needed. */
export function resetStorefrontDbPromise() {
  dbPromise = null;
}
