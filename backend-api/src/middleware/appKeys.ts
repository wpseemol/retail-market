import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../lib/env.js";

const PAYMENT_CALLBACK =
  /^\/api\/payments\/sslcommerz\/(?:success|fail|cancel|ipn)$/;

function sameSecret(given: string, expected: string) {
  const left = Buffer.from(given);
  const right = Buffer.from(expected);
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

function isOpen(req: Request) {
  if (req.method === "OPTIONS") return true;
  const path = req.path;
  // Product images and other files live under /uploads, not /api.
  if (!path.startsWith("/api")) return true;
  if (path === "/api/health" || path.startsWith("/api/health/")) return true;
  return PAYMENT_CALLBACK.test(path);
}

/**
 * Every `/api` route except health and the payment gateway callbacks
 * requires the app public key and the server secret.
 * `/uploads` is not under `/api`, so product images stay reachable.
 */
export function requireAppKeys(req: Request, res: Response, next: NextFunction) {
  if (!env.apiKeysEnforced) {
    next();
    return;
  }
  if (isOpen(req)) {
    next();
    return;
  }

  const publicKey = req.get("x-public-key")?.trim() ?? "";
  const secret = req.get("x-api-secret")?.trim() ?? "";
  if (sameSecret(publicKey, env.apiPublicKey) && sameSecret(secret, env.apiSecretKey)) {
    next();
    return;
  }

  res.status(401).json({
    message: "A valid public key and secret key are required.",
    code: "API_KEY_REQUIRED",
  });
}
