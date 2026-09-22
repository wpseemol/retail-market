import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PROTECTED_PREFIXES = ["/account", "/checkout"];
const AUTH_PAGES = new Set(["/login", "/register"]);

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Old URLs → /login (no /auth prefix)
  if (pathname === "/auth/login" || pathname.startsWith("/auth/login/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (pathname === "/auth/register" || pathname.startsWith("/auth/register/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/register";
    return NextResponse.redirect(url);
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  const loggedIn =
    Boolean(token?.backendUser) && token?.error !== "RefreshTokenError";

  // Already logged in → never show login/register
  if (loggedIn && AUTH_PAGES.has(pathname)) {
    const next = request.nextUrl.searchParams.get("next");
    const dest =
      next &&
      next.startsWith("/") &&
      !next.startsWith("//") &&
      !AUTH_PAGES.has(next) &&
      next !== "/auth/login" &&
      next !== "/auth/register"
        ? next
        : "/account";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (isProtectedPath(pathname) && !loggedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/account",
    "/account/:path*",
    "/checkout",
    "/checkout/:path*",
    "/login",
    "/register",
    "/auth/login",
    "/auth/login/:path*",
    "/auth/register",
    "/auth/register/:path*",
  ],
};
