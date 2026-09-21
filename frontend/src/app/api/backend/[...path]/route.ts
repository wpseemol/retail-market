import { NextResponse } from "next/server";
import {
  applySessionCookie,
  backendFetch,
  clearSessionCookie,
  readSessionFromCookies,
  sealSession,
} from "@/lib/session";
import type { AuthTokenResponse } from "@/lib/api";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const targetPath = `/api/${path.join("/")}`;
  const search = new URL(request.url).search;

  let session = await readSessionFromCookies();

  const method = request.method;
  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  const contentType = request.headers.get("content-type") ?? undefined;

  let upstream = await backendFetch(`${targetPath}${search}`, {
    method,
    body,
    accessToken: session?.accessToken,
    headers: contentType ? { "Content-Type": contentType } : undefined,
  });

  if (upstream.status === 401 && session?.refreshToken) {
    const refreshed = await backendFetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });

    if (!refreshed.ok) {
      const res = NextResponse.json(
        { message: "Session expired" },
        { status: 401 },
      );
      clearSessionCookie(res);
      return res;
    }

    const data = (await refreshed.json()) as AuthTokenResponse;
    session = {
      accessToken: data.accessToken ?? data.token,
      refreshToken: data.refreshToken,
      user: data.user ?? session.user,
    };

    upstream = await backendFetch(`${targetPath}${search}`, {
      method,
      body,
      accessToken: session.accessToken,
      headers: contentType ? { "Content-Type": contentType } : undefined,
    });

    const payload = await upstream.arrayBuffer();
    const res = new NextResponse(payload, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("Content-Type") ?? "application/json",
      },
    });
    applySessionCookie(res, await sealSession(session));
    return res;
  }

  const payload = await upstream.arrayBuffer();
  return new NextResponse(payload, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
