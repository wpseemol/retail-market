import { EncryptJWT, jwtDecrypt, type JWTPayload } from "jose";
import type { ApiUser } from "@/lib/api";

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: ApiUser;
};

type SessionJwtPayload = JWTPayload & {
  accessToken: string;
  refreshToken: string;
  user: ApiUser;
};

export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 365;

function requireAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET must be set in frontend/.env.local (min 32 characters)",
    );
  }
  return secret;
}

async function getEncryptionKey() {
  const secret = requireAuthSecret();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret),
  );
  return new Uint8Array(digest);
}

/** Encrypt session (tokens + user/role). Tampering invalidates the cookie. */
export async function sealSession(session: AuthSession): Promise<string> {
  const key = await getEncryptionKey();
  return new EncryptJWT({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: session.user,
  })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .encrypt(key);
}

/** Decrypt session. Null if missing, expired, or tampered (e.g. role edited). */
export async function unsealSession(
  token: string | undefined | null,
): Promise<AuthSession | null> {
  if (!token) return null;
  try {
    const key = await getEncryptionKey();
    const { payload } = await jwtDecrypt(token, key);
    const data = payload as SessionJwtPayload;
    if (
      typeof data.accessToken !== "string" ||
      typeof data.refreshToken !== "string" ||
      !data.user ||
      typeof data.user !== "object"
    ) {
      return null;
    }
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    };
  } catch {
    return null;
  }
}
