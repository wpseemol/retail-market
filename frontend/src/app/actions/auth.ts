"use server";

import {
  backendFetch,
  callBackendAuth,
  destroySessionCookies,
  readSessionFromCookies,
  writeSessionCookies,
  type AuthActionResult,
} from "@/lib/session";
import type { ApiUser } from "@/lib/api";

/**
 * Server Actions set httpOnly encrypted cookies (tokens + auth user/role).
 * Client components cannot set these cookies — only the server can.
 */

export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  return callBackendAuth("/api/auth/login", input);
}

export async function registerAction(input: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<AuthActionResult> {
  return callBackendAuth("/api/auth/register", input);
}

export async function googleLoginAction(input: {
  accessToken?: string;
  idToken?: string;
}): Promise<AuthActionResult> {
  return callBackendAuth("/api/auth/google", input);
}

export async function logoutAction(): Promise<{ ok: true }> {
  await destroySessionCookies();
  return { ok: true };
}

export async function getSessionAction(): Promise<{
  authenticated: boolean;
  user: ApiUser | null;
}> {
  const session = await readSessionFromCookies();
  if (!session) {
    return { authenticated: false, user: null };
  }
  return { authenticated: true, user: session.user };
}

/** Re-read `/api/auth/me` and refresh the sealed cookie user (avatar / profile). */
export async function syncSessionUserAction(): Promise<AuthActionResult> {
  const session = await readSessionFromCookies();
  if (!session?.accessToken) {
    return {
      ok: false,
      message: "Not authenticated",
      status: 401,
    };
  }

  const upstream = await backendFetch("/api/auth/me", {
    method: "GET",
    accessToken: session.accessToken,
  });

  const data = (await upstream.json().catch(() => ({}))) as {
    user?: ApiUser;
    message?: string;
  };

  if (!upstream.ok || !data.user) {
    return {
      ok: false,
      message: data.message ?? "Failed to refresh profile",
      status: upstream.status,
    };
  }

  await writeSessionCookies({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: data.user,
  });

  return { ok: true, user: data.user };
}
