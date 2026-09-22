"use server";

import { signOut } from "@/auth";
import { auth } from "@/auth";
import type { ApiUser } from "@/lib/api";

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

export async function logoutAction(): Promise<{ ok: true }> {
  await signOut({ redirect: false });
  return { ok: true };
}

export async function getSessionAction(): Promise<{
  authenticated: boolean;
  user: ApiUser | null;
}> {
  const session = await auth();
  if (!session?.backendUser || session.error === "RefreshTokenError") {
    return { authenticated: false, user: null };
  }
  return { authenticated: true, user: session.backendUser };
}

/** Re-fetch `/api/auth/me` for profile/avatar updates (Redux + UI). */
export async function syncSessionUserAction(): Promise<AuthActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, message: "Not authenticated", status: 401 };
  }

  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
    "http://localhost:8001";

  const upstream = await fetch(`${backendUrl}/api/auth/me`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.accessToken}`,
    },
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

  return { ok: true, user: data.user };
}
