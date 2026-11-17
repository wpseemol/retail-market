"use client";

import { getStorefrontDb } from "./database";
import { STALE_MS, type StaleMs } from "./types";

const inflight = new Map<string, Promise<unknown>>();

function isBrowser() {
  return typeof window !== "undefined";
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
  const db = await getStorefrontDb();
  const payload = JSON.stringify(data);
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
      const age = Date.now() - local.updatedAt;
      if (age >= staleMs) {
        void fetchAndStore(id, fetcher).catch(() => undefined);
      }
      return local.data;
    }
  } catch {
    /* fall through to network */
  }

  return fetchAndStore(id, fetcher);
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
        onChange(JSON.parse(doc.payload) as T);
      } catch {
        onChange(null);
      }
    });
  return () => sub.unsubscribe();
}
