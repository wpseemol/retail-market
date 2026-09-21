import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";
import { env } from "./env.js";

export type TokenType = "access" | "refresh";

export type AuthTokenPayload = {
  sub: string;
  role: UserRole;
  typ: TokenType;
  /** Links refresh/access JWTs to `user_sessions.id`. */
  sid?: string;
};

type SignableClaims = Omit<AuthTokenPayload, "typ">;

function signToken(
  claims: SignableClaims,
  typ: TokenType,
  expiresIn: string,
): string {
  const payload: AuthTokenPayload = { ...claims, typ };
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  });
}

function verifyToken(token: string, expectedTyp: TokenType): AuthTokenPayload {
  const decoded = jwt.verify(token, env.jwtSecret);

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof decoded.sub !== "string" ||
    typeof decoded.role !== "string" ||
    decoded.typ !== expectedTyp
  ) {
    throw new Error(`Invalid ${expectedTyp} token payload`);
  }

  return {
    sub: decoded.sub,
    role: decoded.role as UserRole,
    typ: expectedTyp,
    sid: typeof decoded.sid === "string" ? decoded.sid : undefined,
  };
}

/** Short-lived API token (default 1h). */
export function signAccessToken(claims: SignableClaims): string {
  return signToken(claims, "access", env.jwtAccessExpiresIn);
}

/** Long-lived session token (default 365d — keep login ~1 year). */
export function signRefreshToken(claims: SignableClaims): string {
  return signToken(claims, "refresh", env.jwtRefreshExpiresIn);
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  return verifyToken(token, "access");
}

export function verifyRefreshToken(token: string): AuthTokenPayload {
  return verifyToken(token, "refresh");
}

export function issueAuthTokens(claims: SignableClaims) {
  const accessToken = signAccessToken(claims);
  const refreshToken = signRefreshToken(claims);

  return {
    accessToken,
    refreshToken,
    /** @deprecated Prefer `accessToken` — kept for older clients. */
    token: accessToken,
    tokenType: "Bearer" as const,
    expiresIn: env.jwtAccessExpiresIn,
    refreshExpiresIn: env.jwtRefreshExpiresIn,
    sessionId: claims.sid,
  };
}

/** @deprecated Use `signAccessToken`. */
export function signAuthToken(claims: SignableClaims): string {
  return signAccessToken(claims);
}

/** @deprecated Use `verifyAccessToken`. */
export function verifyAuthToken(token: string): AuthTokenPayload {
  return verifyAccessToken(token);
}
