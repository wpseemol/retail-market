import type { NextFunction, Request, Response } from "express";
import { getKvStore } from "./kvStore.js";

const DEFAULT_TTL_MS = 45_000;

function stableQuery(req: Request): string {
  const entries = Object.entries(req.query)
    .map(([k, v]) => {
      if (Array.isArray(v)) return [k, v.map(String).sort().join(",")] as const;
      if (v == null) return [k, ""] as const;
      return [k, String(v)] as const;
    })
    .sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return "_";
  return entries.map(([k, v]) => `${k}=${v}`).join("&").slice(0, 400);
}

/**
 * Cache successful JSON GET bodies briefly.
 * Skips when the request has an Authorization header (staff / signed-in).
 */
export function cacheJsonGet(options: { name: string; ttlMs?: number }) {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET") return next();
    if (req.get("authorization")) return next();

    const key = `cache:${options.name}:${stableQuery(req)}`;

    void (async () => {
      const hit = await getKvStore().get(key);
      if (hit) {
        res.setHeader("X-Cache", "HIT");
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(200).send(hit);
      }

      const originalJson = res.json.bind(res);
      res.json = ((body: unknown) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            void getKvStore().set(key, JSON.stringify(body), ttlMs);
          } catch {
            /* ignore cache write failures */
          }
        }
        res.setHeader("X-Cache", "MISS");
        return originalJson(body);
      }) as Response["json"];

      return next();
    })().catch(next);
  };
}

/** Map storefront revalidate tags → API cache key prefixes. */
export function invalidatePublicCache(tags: string[]) {
  const prefixes = new Set<string>();
  for (const tag of tags) {
    if (!tag) continue;
    if (tag === "site-settings" || tag.startsWith("page:")) {
      prefixes.add("cache:site-settings:");
      prefixes.add("cache:home:");
    }
    if (tag === "home") {
      prefixes.add("cache:home:");
    }
    if (tag === "brands" || tag.startsWith("brand:")) {
      prefixes.add("cache:brands:");
    }
    if (tag === "categories" || tag.startsWith("category:")) {
      prefixes.add("cache:categories:");
    }
  }
  if (prefixes.size === 0) return;
  void (async () => {
    const store = getKvStore();
    for (const prefix of prefixes) {
      await store.delByPrefix(prefix);
    }
  })().catch((err: unknown) => {
    console.warn(
      "[cache] invalidate failed:",
      err instanceof Error ? err.message : err,
    );
  });
}
