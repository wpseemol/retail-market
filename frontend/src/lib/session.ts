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

export {
  sealSession,
  unsealSession,
  SESSION_MAX_AGE_SEC,
  type AuthSession,
} from "@/lib/sessionCrypto";

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SEC) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function clearLegacyCookies(res: NextResponse) {
  const expired = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
  res.cookies.set(ACCESS_COOKIE, "", expired);
  res.cookies.set(REFRESH_COOKIE, "", expired);
  res.cookies.set(USER_COOKIE, "", expired);
}

export function applySessionCookie(res: NextResponse, sealed: string) {
  res.cookies.set(SESSION_COOKIE, sealed, sessionCookieOptions());
  clearLegacyCookies(res);
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  clearLegacyCookies(res);
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
