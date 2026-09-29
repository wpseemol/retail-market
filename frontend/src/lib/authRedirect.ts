const AUTH_PATHS = new Set(["/login", "/register"]);

/** Same-origin path to return to after login/sign-up; falls back to /account. */
export function safeNextPath(raw: string | null | undefined, fallback = "/account") {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return fallback;
  }
  const pathname = raw.split(/[?#]/)[0];
  if (AUTH_PATHS.has(pathname) || pathname.startsWith("/auth/")) return fallback;
  return raw;
}

/** Link to the other auth page, keeping a valid ?next= so the user still lands where they started. */
export function authSwitchHref(target: "/login" | "/register", next: string | null) {
  const safe = safeNextPath(next, "");
  return safe ? `${target}?next=${encodeURIComponent(safe)}` : target;
}
