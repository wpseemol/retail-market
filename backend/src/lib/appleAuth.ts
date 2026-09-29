import { createPublicKey, verify, type JsonWebKey } from "node:crypto";
import type { GoogleIdentity } from "./googleAuth.js";

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys";
const KEYS_CACHE_MS = 6 * 60 * 60 * 1000;

type AppleJwk = JsonWebKey & { kid: string; alg: string };

let keysCache: { at: number; keys: AppleJwk[] } | null = null;

async function appleKeys(forceRefresh = false): Promise<AppleJwk[]> {
  if (!forceRefresh && keysCache && Date.now() - keysCache.at < KEYS_CACHE_MS) {
    return keysCache.keys;
  }
  const res = await fetch(APPLE_KEYS_URL);
  if (!res.ok) throw new Error("Failed to fetch Apple signing keys");
  const body = (await res.json()) as { keys?: AppleJwk[] };
  keysCache = { at: Date.now(), keys: body.keys ?? [] };
  return keysCache.keys;
}

function decodePart<T>(part: string): T {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
}

/**
 * Verify a Sign in with Apple `id_token` (RS256, Apple JWKS) for our Services ID.
 * `name` is only sent by Apple on the very first authorization.
 */
export async function verifyAppleIdToken(
  idToken: string,
  clientId: string,
  name?: { firstName?: string; lastName?: string },
): Promise<GoogleIdentity> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Malformed Apple token");
  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

  const header = decodePart<{ kid?: string; alg?: string }>(headerB64);
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported Apple token");

  let jwk = (await appleKeys()).find((k) => k.kid === header.kid);
  if (!jwk) jwk = (await appleKeys(true)).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("Unknown Apple signing key");

  const valid = verify(
    "RSA-SHA256",
    Buffer.from(`${headerB64}.${payloadB64}`),
    createPublicKey({ key: jwk, format: "jwk" }),
    Buffer.from(signatureB64, "base64url"),
  );
  if (!valid) throw new Error("Invalid Apple token signature");

  const payload = decodePart<{
    iss?: string;
    aud?: string | string[];
    exp?: number;
    sub?: string;
    email?: string;
    email_verified?: boolean | string;
  }>(payloadB64);

  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (payload.iss !== APPLE_ISSUER) throw new Error("Apple token issuer mismatch");
  if (!audiences.includes(clientId)) throw new Error("Apple token audience mismatch");
  if (!payload.exp || payload.exp * 1000 < Date.now()) throw new Error("Apple token expired");
  if (!payload.sub) throw new Error("Apple token is missing subject");

  return {
    sub: payload.sub,
    email: (payload.email ?? "").toLowerCase(),
    emailVerified:
      payload.email_verified === true || payload.email_verified === "true",
    givenName: name?.firstName?.trim() || "Customer",
    familyName: name?.lastName?.trim() || "User",
    picture: null,
  };
}
