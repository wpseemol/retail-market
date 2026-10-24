import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { isIP } from "node:net";
import { env } from "./env.js";

type Bucket = { count: number; resetAt: number };

/**
 * Client address for limits and session logs.
 * Behind Passenger, Express `trust proxy` 1 makes `req.ip` the shopper.
 * The storefront (Vercel) may also send the shopper IP, but only when
 * `X-Client-Ip-Secret` matches `PROXY_IP_SECRET`. A caller who does not
 * know that secret cannot pick their own address.
 */
export function clientAddress(req: Request): string {
  const secret = env.proxyIpSecret;
  const provided = req.get("x-client-ip-secret") ?? "";
  if (secret && provided) {
    const a = Buffer.from(provided);
    const b = Buffer.from(secret);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      const raw = (req.get("x-real-client-ip") ?? "").trim().replace(/^\[|\]$/g, "");
      if (raw.length > 0 && raw.length <= 45 && isIP(raw) !== 0) return raw;
    }
  }
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  return ip.slice(0, 45);
}

/**
 * Fixed-window, in-memory limiter. One Passenger process on shared hosting
 * is enough for this store. A future multi-server VPS should move the buckets
 * to a shared store.
 */
export function rateLimit(options: {
  name: string;
  max: number;
  windowMs: number;
  message: string;
  key?: (req: Request) => string;
}) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    if (buckets.size > 10_000) {
      for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
    }

    const key = options.key ? options.key(req) : clientAddress(req);
    const current = buckets.get(key);
    const bucket =
      current && current.resetAt > now
        ? current
        : { count: 0, resetAt: now + options.windowMs };
    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > options.max) {
      res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000).toString());
      return res.status(429).json({
        message: options.message,
        code: `${options.name}_RATE_LIMITED`,
      });
    }
    return next();
  };
}

function bodyField(req: Request, field: string): string {
  const body = req.body;
  if (!body || typeof body !== "object") return "";
  const value = (body as Record<string, unknown>)[field];
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 255) : "";
}

/** Shared by storefront and dashboard login so one network cannot hop between them. */
export const loginIpLimiter = rateLimit({
  name: "LOGIN_IP",
  max: 40,
  windowMs: 15 * 60 * 1000,
  message: "Too many sign-in attempts from this network. Try again in a few minutes.",
});

export const loginAccountLimiter = rateLimit({
  name: "LOGIN_ACCOUNT",
  max: 8,
  windowMs: 15 * 60 * 1000,
  message: "Too many sign-in attempts for this account. Try again in a few minutes.",
  key: (req) => {
    const id =
      bodyField(req, "email") || bodyField(req, "identifier") || bodyField(req, "username");
    return id ? `acct:${id}` : `ip:${clientAddress(req)}`;
  },
});

export const registerIpLimiter = rateLimit({
  name: "REGISTER_IP",
  max: 10,
  windowMs: 60 * 60 * 1000,
  message: "Too many accounts created from this network. Try again later.",
});

export const registerAccountLimiter = rateLimit({
  name: "REGISTER_ACCOUNT",
  max: 3,
  windowMs: 60 * 60 * 1000,
  message: "Too many attempts for this email. Try again later.",
  key: (req) => {
    const email = bodyField(req, "email");
    return email ? `email:${email}` : `ip:${clientAddress(req)}`;
  },
});

export const refreshLimiter = rateLimit({
  name: "REFRESH",
  max: 60,
  windowMs: 15 * 60 * 1000,
  message: "Too many session refreshes. Try again shortly.",
});

export const socialLoginLimiter = rateLimit({
  name: "SOCIAL_LOGIN",
  max: 20,
  windowMs: 15 * 60 * 1000,
  message: "Too many social sign-in attempts. Try again shortly.",
});
