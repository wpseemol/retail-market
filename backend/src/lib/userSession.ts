import { createHash, randomUUID } from "node:crypto";
import type { Request } from "express";
import type { DeviceType, UserRole } from "@prisma/client";
import { prisma } from "./prisma.js";
import { env } from "./env.js";
import { issueAuthTokens } from "./token.js";

/** Mirrors Prisma `LoginMethod` enum. */
type LoginMethod = "password" | "google" | "refresh";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function parseUserAgent(userAgent: string | undefined): {
  device_type: DeviceType;
  browser: string | null;
  os: string | null;
} {
  const ua = userAgent ?? "";
  const lower = ua.toLowerCase();

  let device_type: DeviceType = "unknown";
  if (/ipad|tablet|kindle|playbook|silk|(android(?!.*mobile))/i.test(ua)) {
    device_type = "tablet";
  } else if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(ua)) {
    device_type = "mobile";
  } else if (ua) {
    device_type = "desktop";
  }

  let browser: string | null = null;
  const edge = ua.match(/Edg(?:e|A|iOS)?\/([\d.]+)/i);
  const chrome = ua.match(/Chrome\/([\d.]+)/i);
  const firefox = ua.match(/Firefox\/([\d.]+)/i);
  const safari = ua.match(/Version\/([\d.]+).*Safari/i);
  if (edge) browser = `Edge ${edge[1]}`;
  else if (chrome && !/Edg/i.test(ua)) browser = `Chrome ${chrome[1]}`;
  else if (firefox) browser = `Firefox ${firefox[1]}`;
  else if (safari) browser = `Safari ${safari[1]}`;
  else if (ua) browser = "Unknown";

  let os: string | null = null;
  if (/windows nt 10/i.test(ua)) os = "Windows 10/11";
  else if (/windows nt 6\.3/i.test(ua)) os = "Windows 8.1";
  else if (/mac os x ([\d_]+)/i.test(ua)) {
    const m = ua.match(/mac os x ([\d_]+)/i);
    os = `macOS ${(m?.[1] ?? "").replace(/_/g, ".")}`;
  } else if (/android ([\d.]+)/i.test(ua)) {
    const m = ua.match(/android ([\d.]+)/i);
    os = `Android ${m?.[1] ?? ""}`.trim();
  } else if (/iphone os ([\d_]+)/i.test(ua) || /ipad; cpu os ([\d_]+)/i.test(ua)) {
    const m = ua.match(/(?:iphone os|cpu os) ([\d_]+)/i);
    os = `iOS ${(m?.[1] ?? "").replace(/_/g, ".")}`;
  } else if (/linux/i.test(lower)) os = "Linux";
  else if (ua) os = "Unknown";

  return { device_type, browser, os };
}

/** Convert env durations like `365d`, `1h`, `30m` into a future Date. */
export function expiresAtFromDuration(duration: string, from = new Date()): Date {
  const match = duration.trim().match(/^(\d+)([smhd])$/i);
  if (!match) {
    return new Date(from.getTime() + 365 * 24 * 60 * 60 * 1000);
  }
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const ms =
    unit === "s"
      ? amount * 1000
      : unit === "m"
        ? amount * 60 * 1000
        : unit === "h"
          ? amount * 60 * 60 * 1000
          : amount * 24 * 60 * 60 * 1000;
  return new Date(from.getTime() + ms);
}

function clientIp(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim().slice(0, 45) || null;
  }
  return (req.ip ?? req.socket.remoteAddress ?? null)?.slice(0, 45) || null;
}

/**
 * On login / register / Google: create a `user_sessions` row, or refresh the
 * active session for the same user + user-agent (same browser/device).
 */
export async function createUserSession(input: {
  userId: bigint;
  role: UserRole;
  req: Request;
  loginMethod: LoginMethod;
}) {
  const ua = reqUserAgent(input.req);
  const uaStored = ua?.slice(0, 2000) || null;
  const parsed = parseUserAgent(ua);
  const now = new Date();
  const expiresAt = expiresAtFromDuration(env.jwtRefreshExpiresIn, now);
  const ip = clientIp(input.req);

  // Reuse the active session for this device so login updates the row
  // instead of inserting a duplicate every time.
  const existing = uaStored
    ? await prisma.userSession.findFirst({
        where: {
          user_id: input.userId,
          user_agent: uaStored,
          is_revoked: false,
          expires_at: { gt: now },
        },
        orderBy: { last_activity_at: "desc" },
      })
    : null;

  const sessionId = existing?.id ?? randomUUID();
  const tokens = issueAuthTokens({
    sub: input.userId.toString(),
    role: input.role,
    sid: sessionId,
  });

  const sessionFields = {
    token_hash: hashToken(tokens.refreshToken),
    ip_address: ip,
    user_agent: uaStored,
    device_type: parsed.device_type,
    browser: parsed.browser,
    os: parsed.os,
    login_method: input.loginMethod,
    is_revoked: false,
    revoked_at: null as Date | null,
    last_activity_at: now,
    expires_at: expiresAt,
  };

  if (existing) {
    await prisma.userSession.update({
      where: { id: existing.id },
      data: sessionFields,
    });
  } else {
    await prisma.userSession.create({
      data: {
        id: sessionId,
        user_id: input.userId,
        ...sessionFields,
      },
    });
  }

  return { sessionId, tokens };
}

export async function rotateUserSession(input: {
  sessionId: string;
  userId: bigint;
  role: UserRole;
  oldRefreshToken: string;
  req: Request;
}) {
  const existing = await prisma.userSession.findFirst({
    where: {
      id: input.sessionId,
      user_id: input.userId,
      is_revoked: false,
      expires_at: { gt: new Date() },
    },
  });

  if (!existing) {
    return null;
  }

  if (existing.token_hash !== hashToken(input.oldRefreshToken)) {
    // Possible token reuse / theft — revoke the session.
    await prisma.userSession.update({
      where: { id: existing.id },
      data: { is_revoked: true, revoked_at: new Date() },
    });
    return null;
  }

  const tokens = issueAuthTokens({
    sub: input.userId.toString(),
    role: input.role,
    sid: existing.id,
  });

  const ua = reqUserAgent(input.req);
  const parsed = parseUserAgent(ua);

  await prisma.userSession.update({
    where: { id: existing.id },
    data: {
      token_hash: hashToken(tokens.refreshToken),
      ip_address: clientIp(input.req) ?? existing.ip_address,
      user_agent: ua?.slice(0, 2000) || existing.user_agent,
      device_type: parsed.device_type || existing.device_type,
      browser: parsed.browser ?? existing.browser,
      os: parsed.os ?? existing.os,
      login_method: "refresh",
      last_activity_at: new Date(),
      expires_at: expiresAtFromDuration(env.jwtRefreshExpiresIn),
    },
  });

  return { sessionId: existing.id, tokens };
}

function reqUserAgent(req: Request): string | undefined {
  const value = req.headers["user-agent"];
  return typeof value === "string" ? value : undefined;
}
