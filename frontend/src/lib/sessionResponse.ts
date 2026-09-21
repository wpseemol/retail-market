import { NextResponse } from "next/server";
import type { AuthTokenResponse } from "@/lib/api";
import {
  applySessionCookie,
  backendFetch,
  sealSession,
  type AuthSession,
} from "@/lib/session";

export async function createSessionResponse(
  data: AuthTokenResponse,
  status = 200,
) {
  const session: AuthSession = {
    accessToken: data.accessToken ?? data.token,
    refreshToken: data.refreshToken,
    user: data.user,
  };

  const sealed = await sealSession(session);
  const res = NextResponse.json(
    {
      message: data.message,
      user: data.user,
      authenticated: true,
    },
    { status },
  );
  applySessionCookie(res, sealed);
  return res;
}

export async function forwardAuthJson(
  path: string,
  body: unknown,
  successStatus?: number,
) {
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
    return NextResponse.json(
      {
        message: data.message ?? "Request failed",
        code: data.code,
        errors: data.errors,
      },
      { status: upstream.status },
    );
  }

  return createSessionResponse(data, successStatus ?? upstream.status);
}
