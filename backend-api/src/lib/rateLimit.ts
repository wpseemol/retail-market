import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { isIP } from "node:net";
import { env } from "./env.js";
import { getKvStore } from "./kvStore.js";

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
 * Fixed-window limiter. Uses Redis when REDIS_URL is set, otherwise in-memory.
 * One Passenger process on Spaceship is enough with memory; multi-worker needs Redis.
 */
export function rateLimit(options: {
  name: string;
  max: number;
  windowMs: number;
  message: string;
  key?: (req: Request) => string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      const keyPart = options.key ? options.key(req) : clientAddress(req);
      const storeKey = `rl:${options.name}:${keyPart}`;
      const { count, resetAt, ttlMs } = await getKvStore().incr(
        storeKey,
        options.windowMs,
      );

      if (count > options.max) {
        const retryAfterSec = Math.max(
          1,
          Math.ceil((ttlMs || resetAt - Date.now()) / 1000),
        );
        res.setHeader("Retry-After", retryAfterSec.toString());
        return res.status(429).json({
          message: options.message,
          code: `${options.name}_RATE_LIMITED`,
        });
      }
      return next();
    })().catch(next);
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

/** Whole `/api` surface — skips health and SSLCOMMERZ gateway callbacks. */
export const globalApiLimiter = rateLimit({
  name: "GLOBAL_API",
  max: 300,
  windowMs: 60 * 1000,
  message: "Too many requests. Slow down and try again shortly.",
});

export const orderPlaceLimiter = rateLimit({
  name: "ORDER_PLACE",
  max: 10,
  windowMs: 10 * 60 * 1000,
  message: "Too many orders from this network. Try again in a few minutes.",
});

export const shippingQuoteLimiter = rateLimit({
  name: "SHIPPING_QUOTE",
  max: 40,
  windowMs: 10 * 60 * 1000,
  message: "Too many shipping quotes. Try again in a few minutes.",
});

export const paymentRetryLimiter = rateLimit({
  name: "PAYMENT_RETRY",
  max: 10,
  windowMs: 10 * 60 * 1000,
  message: "Too many payment retries. Try again in a few minutes.",
});

/** Paths that must stay reachable during an attack (gateway + health). */
export function isGlobalRateLimitExempt(req: Request): boolean {
  const path = (req.originalUrl || req.url || "").split("?")[0] ?? "";
  if (req.method === "GET" && (path === "/api/health" || path === "/api/health/")) {
    return true;
  }
  const paymentCallbacks = [
    "/api/payments/sslcommerz/success",
    "/api/payments/sslcommerz/fail",
    "/api/payments/sslcommerz/cancel",
    "/api/payments/sslcommerz/ipn",
  ];
  return paymentCallbacks.some((p) => path === p || path === `${p}/`);
}
