import type { NextFunction, Request, Response } from "express";

type Bucket = { count: number; resetAt: number };

/**
 * Fixed-window, in-memory limiter keyed by client IP. Per-process only — put a shared
 * store (Redis) in front when the API runs on more than one instance.
 */
export function rateLimit(options: { name: string; max: number; windowMs: number; message: string }) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    if (buckets.size > 10_000) {
      for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
    }

    const key = req.ip ?? "unknown";
    const current = buckets.get(key);
    const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + options.windowMs };
    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > options.max) {
      res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000).toString());
      return res.status(429).json({ message: options.message, code: `${options.name}_RATE_LIMITED` });
    }
    return next();
  };
}
