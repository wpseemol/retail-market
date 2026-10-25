import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { backendFetch } from "@/lib/session";
import type { AuthTokenResponse } from "@/lib/api";

type RouteContext = { params: Promise<{ path: string[] }> };

/**
 * BFF: attach backend accessToken from Auth.js JWT cookie.
 * On 401, rotate via backend refresh once for this request.
 * Auth.js jwt callback also refreshes on the next session read.
 */
async function proxy(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const targetPath = `/api/${path.join("/")}`;
  const search = new URL(request.url).search;

  let token: Awaited<ReturnType<typeof getToken>> = null;
  try {
    token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
    });
  } catch {
    token = null;
  }

  const method = request.method;
  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  const contentType = request.headers.get("content-type") ?? undefined;
  // Shopper IP is attached in `backendFetch` via PROXY_IP_SECRET. Do not copy
  // the raw X-Forwarded-For header — the caller can set that themselves.
  const forwardHeaders: Record<string, string> = {
    ...(contentType ? { "Content-Type": contentType } : {}),
  };

  let accessToken = token?.accessToken as string | undefined;

  let upstream = await backendFetch(`${targetPath}${search}`, {
    method,
    body,
    accessToken,
    headers: forwardHeaders,
  });

  if (upstream.status === 401 && token?.refreshToken) {
    const refreshed = await backendFetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
    });

    if (!refreshed.ok) {
      return NextResponse.json({ message: "Session expired" }, { status: 401 });
    }

    const data = (await refreshed.json()) as AuthTokenResponse;
    accessToken = data.accessToken ?? data.token;

    upstream = await backendFetch(`${targetPath}${search}`, {
      method,
      body,
      accessToken,
      headers: forwardHeaders,
    });
  }

  const status = upstream.status;
  const noBody = status === 204 || status === 205 || status === 304;
  const payload = noBody ? null : await upstream.arrayBuffer();
  return new NextResponse(payload, {
    status,
    headers: noBody
      ? {}
      : {
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
