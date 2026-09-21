import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  SESSION_COOKIE,
  USER_COOKIE,
} from "@/lib/authCookieNames";
import {
  sealSession,
  unsealSession,
  SESSION_MAX_AGE_SEC,
  type AuthSession,
} from "@/lib/sessionCrypto";
import type { AuthTokenResponse, ApiUser } from "@/lib/api";

export {
  sealSession,
  unsealSession,
  SESSION_MAX_AGE_SEC,
  type AuthSession,
} from "@/lib/sessionCrypto";

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SEC) {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

function clearLegacyOnResponse(res: NextResponse) {
  const expired = { ...sessionCookieOptions(), maxAge: 0 };
  res.cookies.set(ACCESS_COOKIE, "", expired);
  res.cookies.set(REFRESH_COOKIE, "", expired);
  res.cookies.set(USER_COOKIE, "", expired);
}

async function clearLegacyOnJar() {
  const jar = await cookies();
  const expired = { ...sessionCookieOptions(), maxAge: 0 };
  jar.set(ACCESS_COOKIE, "", expired);
  jar.set(REFRESH_COOKIE, "", expired);
  jar.set(USER_COOKIE, "", expired);
}

/** Route Handlers: set encrypted session on a NextResponse. */
export function applySessionCookie(res: NextResponse, sealed: string) {
  res.cookies.set(SESSION_COOKIE, sealed, sessionCookieOptions());
  clearLegacyOnResponse(res);
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  clearLegacyOnResponse(res);
}

/** Server Actions: set encrypted session via `cookies()`. */
export async function writeSessionCookies(session: AuthSession) {
  const sealed = await sealSession(session);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sealed, sessionCookieOptions());
  await clearLegacyOnJar();
}

export async function destroySessionCookies() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  await clearLegacyOnJar();
}

export async function readSessionFromCookies(): Promise<AuthSession | null> {
  const jar = await cookies();
  return unsealSession(jar.get(SESSION_COOKIE)?.value);
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8001";

export async function backendFetch(
  path: string,
  init: RequestInit & { accessToken?: string | null } = {},
) {
  const { accessToken, headers: initHeaders, ...rest } = init;
  const headers = new Headers(initHeaders);
  headers.set("Accept", "application/json");
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return fetch(`${BACKEND_URL}${path}`, {
    ...rest,
    headers,
  });
}

export type AuthActionResult =
  | {
      ok: true;
      user: ApiUser;
      message?: string;
    }
  | {
      ok: false;
      message: string;
      code?: string;
      errors?: Record<string, string[] | undefined>;
      status: number;
    };

export async function persistBackendAuth(
  data: AuthTokenResponse,
): Promise<AuthActionResult> {
  await writeSessionCookies({
    accessToken: data.accessToken ?? data.token,
    refreshToken: data.refreshToken,
    user: data.user,
  });
  return {
    ok: true,
    user: data.user,
    message: data.message,
  };
}

export async function callBackendAuth(
  path: string,
  body: unknown,
): Promise<AuthActionResult> {
  const upstream = await backendFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await upstream.json().catch(() => ({}))) as AuthTokenResponse & {
    message?: string;
    code?: string;
    errors?: Record<string, string[] | undefined>;
  };

  if (!upstream.ok) {
    return {
      ok: false,
      message: data.message ?? "Request failed",
      code: data.code,
      errors: data.errors,
      status: upstream.status,
    };
  }

  return persistBackendAuth(data);
}
