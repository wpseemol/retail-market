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

export type TokenTtls = {
  accessExpiresIn: string;
  refreshExpiresIn: string;
};

/** Role-based JWT lifetimes — elevated staff get short refresh windows. */
export function tokenTtlsForRole(role: UserRole): TokenTtls {
  if (
    role === "super_admin" ||
    role === "admin" ||
    role === "moderator"
  ) {
    return {
      accessExpiresIn: env.jwtStaffAccessExpiresIn,
      refreshExpiresIn: env.jwtStaffRefreshExpiresIn,
    };
  }

  if (role === "vendor") {
    return {
      accessExpiresIn: env.jwtVendorAccessExpiresIn,
      refreshExpiresIn: env.jwtVendorRefreshExpiresIn,
    };
  }

  return {
    accessExpiresIn: env.jwtAccessExpiresIn,
    refreshExpiresIn: env.jwtRefreshExpiresIn,
  };
}

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

/** Short-lived API token (role-aware). */
export function signAccessToken(
  claims: SignableClaims,
  expiresIn = tokenTtlsForRole(claims.role).accessExpiresIn,
): string {
  return signToken(claims, "access", expiresIn);
}

/** Session refresh token (role-aware — elevated staff are short-lived). */
export function signRefreshToken(
  claims: SignableClaims,
  expiresIn = tokenTtlsForRole(claims.role).refreshExpiresIn,
): string {
  return signToken(claims, "refresh", expiresIn);
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  return verifyToken(token, "access");
}

export function verifyRefreshToken(token: string): AuthTokenPayload {
  return verifyToken(token, "refresh");
}

export function issueAuthTokens(claims: SignableClaims) {
  const ttls = tokenTtlsForRole(claims.role);
  const accessToken = signAccessToken(claims, ttls.accessExpiresIn);
  const refreshToken = signRefreshToken(claims, ttls.refreshExpiresIn);

  return {
    accessToken,
    refreshToken,
    /** @deprecated Prefer `accessToken` — kept for older clients. */
    token: accessToken,
    tokenType: "Bearer" as const,
    expiresIn: ttls.accessExpiresIn,
    refreshExpiresIn: ttls.refreshExpiresIn,
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
