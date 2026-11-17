import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { env } from "./env.js";

export const CSRF_COOKIE = "rm_csrf";
export const CSRF_HEADER = "x-csrf-token";
/** Token lifetime — long enough for a slow auth form, short enough to rotate. */
const CSRF_TTL_MS = 2 * 60 * 60 * 1000;

type CsrfPayload = {
  n: string;
  exp: number;
};

function signingKey() {
  return createHmac("sha256", env.jwtSecret).update("rm-csrf-v1").digest();
}

function b64url(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

/** Issue a signed CSRF token (`base64url(payload).base64url(mac)`). */
export function issueCsrfToken(now = Date.now()): { token: string; expiresAt: number } {
  const expiresAt = now + CSRF_TTL_MS;
  const payload: CsrfPayload = {
    n: b64url(randomBytes(16)),
    exp: expiresAt,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const mac = b64url(createHmac("sha256", signingKey()).update(body).digest());
  return { token: `${body}.${mac}`, expiresAt };
}

function safeEqualStr(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

/** Returns true when the token is well-formed, signed, and not expired. */
export function verifyCsrfToken(token: string, now = Date.now()): boolean {
  const trimmed = token.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0) return false;
  const body = trimmed.slice(0, dot);
  const mac = trimmed.slice(dot + 1);
  if (!body || !mac) return false;

  const expected = b64url(createHmac("sha256", signingKey()).update(body).digest());
  if (!safeEqualStr(mac, expected)) return false;

  try {
    const payload = JSON.parse(fromB64url(body).toString("utf8")) as CsrfPayload;
    if (typeof payload.n !== "string" || typeof payload.exp !== "number") return false;
    if (!payload.n || payload.exp < now) return false;
    return true;
  } catch {
    return false;
  }
}

/** Read a single cookie value from the Cookie header (no cookie-parser). */
export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    if (key !== name) continue;
    return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

export function readSubmittedCsrf(req: Request): string {
  const header = req.get(CSRF_HEADER)?.trim() ?? "";
  if (header) return header;
  const body = req.body;
  if (body && typeof body === "object" && typeof body.csrfToken === "string") {
    return body.csrfToken.trim();
  }
  return "";
}

export function setCsrfCookie(res: Response, token: string, expiresAt: number) {
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  const parts = [
    `${CSRF_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "SameSite=Lax",
  ];
  if (env.nodeEnv === "production") {
    parts.push("Secure");
  }
  // Not HttpOnly — clients may mirror into X-CSRF-Token; integrity is HMAC.
  res.append("Set-Cookie", parts.join("; "));
}
