import { createClient, type RedisClientType } from "redis";
import { env } from "./env.js";

export type IncrResult = { count: number; resetAt: number; ttlMs: number };

/**
 * Shared key/value used by rate limits and the short public GET cache.
 * Memory when REDIS_URL is empty (Spaceship). Redis when set (Upstash / VPS).
 */
export type KvStore = {
  /** Fixed-window counter. Returns the new count and when the window ends. */
  incr(key: string, windowMs: number): Promise<IncrResult>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Delete every key that starts with `prefix` (memory scan / Redis SCAN). */
  delByPrefix(prefix: string): Promise<void>;
};

type MemoryEntry = { value: string; expiresAt: number };
type MemoryCounter = { count: number; resetAt: number };

function createMemoryStore(): KvStore {
  const strings = new Map<string, MemoryEntry>();
  const counters = new Map<string, MemoryCounter>();

  function prune(now: number) {
    if (strings.size + counters.size <= 12_000) return;
    for (const [key, entry] of strings) {
      if (entry.expiresAt <= now) strings.delete(key);
    }
    for (const [key, entry] of counters) {
      if (entry.resetAt <= now) counters.delete(key);
    }
  }

  return {
    async incr(key, windowMs) {
      const now = Date.now();
      prune(now);
      const current = counters.get(key);
      const bucket =
        current && current.resetAt > now
          ? current
          : { count: 0, resetAt: now + windowMs };
      bucket.count += 1;
      counters.set(key, bucket);
      return {
        count: bucket.count,
        resetAt: bucket.resetAt,
        ttlMs: Math.max(0, bucket.resetAt - now),
      };
    },
    async get(key) {
      const now = Date.now();
      const entry = strings.get(key);
      if (!entry) return null;
      if (entry.expiresAt <= now) {
        strings.delete(key);
        return null;
      }
      return entry.value;
    },
    async set(key, value, ttlMs) {
      const now = Date.now();
      prune(now);
      strings.set(key, { value, expiresAt: now + Math.max(1, ttlMs) });
    },
    async del(key) {
      strings.delete(key);
      counters.delete(key);
    },
    async delByPrefix(prefix) {
      for (const key of [...strings.keys()]) {
        if (key.startsWith(prefix)) strings.delete(key);
      }
      for (const key of [...counters.keys()]) {
        if (key.startsWith(prefix)) counters.delete(key);
      }
    },
  };
}

function createRedisStore(client: RedisClientType, fallback: KvStore): KvStore {
  return {
    async incr(key, windowMs) {
      try {
        const count = await client.incr(key);
        if (count === 1) {
          await client.pExpire(key, Math.max(1, windowMs));
        }
        let ttlMs = await client.pTTL(key);
        if (ttlMs < 0) {
          await client.pExpire(key, Math.max(1, windowMs));
          ttlMs = windowMs;
        }
        return {
          count,
          resetAt: Date.now() + ttlMs,
          ttlMs,
        };
      } catch (err) {
        console.warn(
          "[kv] Redis incr failed; using memory:",
          err instanceof Error ? err.message : err,
        );
        return fallback.incr(key, windowMs);
      }
    },
    async get(key) {
      try {
        return await client.get(key);
      } catch (err) {
        console.warn(
          "[kv] Redis get failed; using memory:",
          err instanceof Error ? err.message : err,
        );
        return fallback.get(key);
      }
    },
    async set(key, value, ttlMs) {
      try {
        await client.set(key, value, { PX: Math.max(1, ttlMs) });
      } catch (err) {
        console.warn(
          "[kv] Redis set failed; using memory:",
          err instanceof Error ? err.message : err,
        );
        await fallback.set(key, value, ttlMs);
      }
    },
    async del(key) {
      try {
        await client.del(key);
      } catch (err) {
        console.warn(
          "[kv] Redis del failed; using memory:",
          err instanceof Error ? err.message : err,
        );
        await fallback.del(key);
      }
      await fallback.del(key);
    },
    async delByPrefix(prefix) {
      try {
        let cursor = "0";
        do {
          const reply = await client.scan(cursor, {
            MATCH: `${prefix}*`,
            COUNT: 100,
          });
          cursor = String(reply.cursor);
          if (reply.keys.length > 0) await client.del(reply.keys);
        } while (cursor !== "0");
      } catch (err) {
        console.warn(
          "[kv] Redis delByPrefix failed; using memory:",
          err instanceof Error ? err.message : err,
        );
      }
      await fallback.delByPrefix(prefix);
    },
  };
}

const memoryStore = createMemoryStore();
let store: KvStore = memoryStore;
let redisClient: RedisClientType | null = null;
let redisWarned = false;

/**
 * Active store. Memory until Redis connects; stays on memory when REDIS_URL is empty
 * or when Redis fails so the API keeps serving.
 */
export function getKvStore(): KvStore {
  return store;
}

/** Call once at boot. Safe when REDIS_URL is empty. */
export async function initKvStore(): Promise<void> {
  const url = env.redisUrl;
  if (!url) {
    store = memoryStore;
    return;
  }

  const client: RedisClientType = createClient({ url });
  client.on("error", (err) => {
    if (!redisWarned) {
      redisWarned = true;
      console.warn(
        "[kv] Redis error; rate limits / cache fall back to memory:",
        err instanceof Error ? err.message : err,
      );
    }
    store = memoryStore;
  });

  try {
    await client.connect();
    redisClient = client;
    store = createRedisStore(client, memoryStore);
    console.info("[kv] Redis connected — shared rate limits and cache enabled.");
  } catch (err) {
    console.warn(
      "[kv] Redis connect failed; using in-memory store:",
      err instanceof Error ? err.message : err,
    );
    store = memoryStore;
    try {
      await client.quit();
    } catch {
      /* ignore */
    }
  }
}

export async function closeKvStore(): Promise<void> {
  if (!redisClient) return;
  try {
    await redisClient.quit();
  } catch {
    /* ignore */
  }
  redisClient = null;
  store = memoryStore;
}
