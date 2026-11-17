"use client";

import { getStorefrontDb } from "./database";
import { STALE_MS, type StaleMs } from "./types";

const inflight = new Map<string, Promise<unknown>>();

/** Stay under IndexedDB / Dexie practical limits; oversized docs are skipped silently. */
const MAX_PAYLOAD_BYTES = 1_500_000;

function isBrowser() {
  return typeof window !== "undefined";
}

/**
 * Refuse to persist null/undefined, empty strings, or error-shaped envelopes.
 * Empty product lists with a real pagination object are still cacheable (valid search).
 */
export function isCacheablePayload(data: unknown): boolean {
  if (data == null) return false;
  if (typeof data === "string" && data.length === 0) return false;
  if (typeof data === "object" && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    if ("error" in obj && typeof obj.error === "string") {
      const hasCatalog =
        "products" in obj ||
        "categories" in obj ||
        "brands" in obj ||
        "shops" in obj ||
        "blocks" in obj ||
        "id" in obj ||
        "settings" in obj;
      if (!hasCatalog) return false;
    }
  }
  return true;
}

async function readLocal<T>(id: string): Promise<{ data: T; updatedAt: number } | null> {
  const db = await getStorefrontDb();
  const doc = await db.catalog.findOne(id).exec();
  if (!doc) return null;
  try {
    return { data: JSON.parse(doc.payload) as T, updatedAt: doc.updatedAt };
  } catch {
    return null;
  }
}

async function writeLocal<T>(id: string, data: T): Promise<void> {
  if (!isCacheablePayload(data)) return;
  const payload = JSON.stringify(data);
  if (payload.length > MAX_PAYLOAD_BYTES) return;

  const db = await getStorefrontDb();
  const updatedAt = Date.now();
  const existing = await db.catalog.findOne(id).exec();
  if (existing) {
    await existing.incrementalPatch({ payload, updatedAt });
  } else {
    await db.catalog.insert({ id, payload, updatedAt });
  }
}

async function fetchAndStore<T>(id: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inflight.get(id);
  if (existing) return existing as Promise<T>;

  const promise = (async () => {
    const data = await fetcher();
    try {
      await writeLocal(id, data);
    } catch {
      /* IndexedDB full / private mode — still return network data */
    }
    return data;
  })().finally(() => {
    inflight.delete(id);
  });

  inflight.set(id, promise);
  return promise;
}

/**
 * Stale-while-revalidate read-through cache.
 * - SSR / non-browser: always calls `fetcher`.
 * - Fresh local hit: return immediately.
 * - Stale local hit: return immediately and refresh in background.
 * - Miss: await network, upsert, return.
 */
export async function readThrough<T>(
  id: string,
  fetcher: () => Promise<T>,
  staleMs: StaleMs = STALE_MS.catalog,
): Promise<T> {
  if (!isBrowser()) return fetcher();

  try {
    const local = await readLocal<T>(id);
    if (local) {
      if (!isCacheablePayload(local.data)) {
        /* poisoned empty/error — ignore and refetch */
      } else {
        const age = Date.now() - local.updatedAt;
        if (age >= staleMs) {
          void fetchAndStore(id, fetcher).catch(() => undefined);
        }
        return local.data;
      }
    }
  } catch {
    /* fall through to network */
  }

  return fetchAndStore(id, fetcher);
}

/** Upsert SSR / known-good payload into IndexedDB (no network). */
export async function seedCatalogCache<T>(id: string, data: T): Promise<void> {
  if (!isBrowser()) return;
  try {
    await writeLocal(id, data);
  } catch {
    /* ignore */
  }
}

export { hashQuery, queryCacheId } from "./hash";

/** Subscribe to a cache doc; calls `onChange` when background refresh upserts. */
export async function subscribeCacheDoc<T>(
  id: string,
  onChange: (data: T | null) => void,
): Promise<() => void> {
  if (!isBrowser()) {
    onChange(null);
    return () => undefined;
  }
  const db = await getStorefrontDb();
  const sub = db.catalog
    .findOne(id)
    .$.subscribe((doc) => {
      if (!doc) {
        onChange(null);
        return;
      }
      try {
        const parsed = JSON.parse(doc.payload) as T;
        onChange(isCacheablePayload(parsed) ? parsed : null);
      } catch {
        onChange(null);
      }
    });
  return () => sub.unsubscribe();
}
