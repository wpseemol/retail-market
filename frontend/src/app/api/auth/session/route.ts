import { NextResponse } from "next/server";
import type { AuthTokenResponse } from "@/lib/api";
import {
  applySessionCookie,
  backendFetch,
  clearSessionCookie,
  readSessionFromCookies,
  sealSession,
} from "@/lib/session";

/** Current session user (role comes from encrypted cookie — not editable in DevTools). */
export async function GET() {
  const session = await readSessionFromCookies();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    user: session.user,
  });
}

/** Refresh access token and re-seal httpOnly session cookie. */
export async function POST() {
  const session = await readSessionFromCookies();
  if (!session?.refreshToken) {
    const res = NextResponse.json(
      { message: "Not authenticated" },
      { status: 401 },
    );
    clearSessionCookie(res);
    return res;
  }

  const upstream = await backendFetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });

  const data = (await upstream.json().catch(() => ({}))) as AuthTokenResponse & {
    message?: string;
  };

  if (!upstream.ok) {
    const res = NextResponse.json(
      { message: data.message ?? "Session expired" },
      { status: upstream.status },
    );
    clearSessionCookie(res);
    return res;
  }

  const sealed = await sealSession({
    accessToken: data.accessToken ?? data.token,
    refreshToken: data.refreshToken,
    user: data.user ?? session.user,
  });

  const res = NextResponse.json({
    authenticated: true,
    user: data.user ?? session.user,
    message: data.message,
  });
  applySessionCookie(res, sealed);
  return res;
}

/** Log out — wipe encrypted session cookie. */
export async function DELETE() {
  const res = NextResponse.json({ authenticated: false, message: "Logged out" });
  clearSessionCookie(res);
  return res;
}
