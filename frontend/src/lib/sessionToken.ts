import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/** HTTPS (including Vercel’s forwarded proto) uses the `__Secure-` session cookie. */
export function useSecureSessionCookie(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() === "https";
  }
  return request.nextUrl.protocol === "https:";
}

/** Cookie name Auth.js sets, which is also the JWT salt. */
export function sessionCookieName(secure: boolean) {
  return `${secure ? "__Secure-" : ""}authjs.session-token`;
}

/** Read the Auth.js login cookie. `getToken` defaults to the non-secure name. */
export function readSessionToken(request: NextRequest) {
  const secureCookie = useSecureSessionCookie(request);
  const cookieName = sessionCookieName(secureCookie);
  return getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie,
    cookieName,
    salt: cookieName,
  });
}
