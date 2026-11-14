import { randomBytes, createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";
import * as OTPAuth from "otpauth";
import { env } from "./env.js";
import { decryptSecret, encryptSecret } from "./secretBox.js";
import { hashPassword, verifyPassword } from "./password.js";

export const TWO_FACTOR_REQUIRED_ROLES: UserRole[] = ["super_admin", "admin"];

export function roleRequiresTwoFactor(role: UserRole) {
  return TWO_FACTOR_REQUIRED_ROLES.includes(role);
}

export function isTwoFactorEnabled(user: {
  two_factor_confirmed_at: Date | null;
  two_factor_secret: string | null;
}) {
  return Boolean(user.two_factor_confirmed_at && user.two_factor_secret);
}

/** Whether login must pass a TOTP (or setup) step after password. */
export function loginNeedsTwoFactor(user: {
  role: UserRole;
  two_factor_confirmed_at: Date | null;
  two_factor_secret: string | null;
}): "none" | "setup" | "challenge" {
  const enabled = isTwoFactorEnabled(user);
  if (enabled) return "challenge";
  if (roleRequiresTwoFactor(user.role)) return "setup";
  return "none";
}

export function generateTotpSecret() {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

export function buildOtpauthUrl(input: {
  secret: string;
  accountName: string;
  issuer?: string;
}) {
  const totp = new OTPAuth.TOTP({
    issuer: input.issuer ?? env.appName,
    label: input.accountName,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(input.secret),
  });
  return totp.toString();
}

export function verifyTotpCode(secret: string, code: string) {
  const cleaned = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;
  const totp = new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  const delta = totp.validate({ token: cleaned, window: 1 });
  return delta !== null;
}

function formatRecoveryCode(bytes: Buffer) {
  const hex = bytes.toString("hex").toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

/** 8 single-use recovery codes shown once; store hashed. */
export async function generateRecoveryCodes(count = 8) {
  const plain: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = formatRecoveryCode(randomBytes(6));
    plain.push(code);
    hashed.push(await hashPassword(code));
  }
  return { plain, hashed };
}

export function packRecoveryHashes(hashed: string[]) {
  return encryptSecret(JSON.stringify(hashed));
}

export function unpackRecoveryHashes(payload: string | null | undefined): string[] {
  const raw = decryptSecret(payload);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

export async function consumeRecoveryCode(
  storedEncrypted: string | null | undefined,
  code: string,
): Promise<{ ok: true; nextEncrypted: string | null } | { ok: false }> {
  const cleaned = code.trim().toUpperCase().replace(/\s+/g, "");
  if (!cleaned) return { ok: false };
  const hashes = unpackRecoveryHashes(storedEncrypted);
  for (let i = 0; i < hashes.length; i++) {
    if (await verifyPassword(cleaned, hashes[i]!)) {
      const next = hashes.filter((_, idx) => idx !== i);
      return {
        ok: true,
        nextEncrypted: next.length > 0 ? packRecoveryHashes(next) : null,
      };
    }
  }
  return { ok: false };
}

export type TwoFactorPurpose = "2fa_setup" | "2fa_challenge";

export type TwoFactorTokenPayload = {
  sub: string;
  role: UserRole;
  purpose: TwoFactorPurpose;
  /** Encrypted pending TOTP secret (setup only, after /2fa/setup). */
  ps?: string;
};

const SETUP_TTL = "10m";
const CHALLENGE_TTL = "5m";

export function signTwoFactorToken(input: {
  userId: bigint;
  role: UserRole;
  purpose: TwoFactorPurpose;
  pendingSecret?: string;
}) {
  const payload: TwoFactorTokenPayload = {
    sub: input.userId.toString(),
    role: input.role,
    purpose: input.purpose,
  };
  if (input.pendingSecret) {
    payload.ps = encryptSecret(input.pendingSecret);
  }
  const expiresIn = input.purpose === "2fa_setup" ? SETUP_TTL : CHALLENGE_TTL;
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  });
}

export function verifyTwoFactorToken(
  token: string,
  expected: TwoFactorPurpose,
): TwoFactorTokenPayload {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof decoded.sub !== "string" ||
    typeof decoded.role !== "string" ||
    decoded.purpose !== expected
  ) {
    throw new Error("Invalid two-factor token");
  }
  return {
    sub: decoded.sub,
    role: decoded.role as UserRole,
    purpose: expected,
    ps: typeof decoded.ps === "string" ? decoded.ps : undefined,
  };
}

export function pendingSecretFromToken(payload: TwoFactorTokenPayload) {
  return decryptSecret(payload.ps ?? null);
}

/** Fingerprint used only for logging — never store raw secrets. */
export function secretFingerprint(secret: string) {
  return createHash("sha256").update(secret).digest("hex").slice(0, 12);
}
