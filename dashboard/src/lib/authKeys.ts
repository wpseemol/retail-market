/**
 * Session storage keys for dashboard staff auth.
 * Kept separate so api + store can share without circular imports.
 */
import {
  readSealedText,
  removeSealed,
  writeSealedText,
} from "./secureStorage";

export const STAFF_TOKEN_KEY = "rm_staff_access_token";
export const STAFF_REFRESH_KEY = "rm_staff_refresh_token";
export const STAFF_USER_KEY = "rm_staff_user";

/** Same-origin cookie the dashboard proxy can read if `Authorization` is dropped. */
export const STAFF_ACCESS_COOKIE = "rm_access";

export function writeAccessCookie(token: string | null) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  if (!token) {
    document.cookie = `${STAFF_ACCESS_COOKIE}=; Path=/; Max-Age=0; SameSite=Strict${secure}`;
    return;
  }
  document.cookie = `${STAFF_ACCESS_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=1200; SameSite=Strict${secure}`;
}

export function readStaffAccessToken(): string | null {
  return readSealedText(STAFF_TOKEN_KEY);
}

export function readStaffRefreshToken(): string | null {
  return readSealedText(STAFF_REFRESH_KEY);
}

export function writeStaffTokens(
  accessToken: string,
  refreshToken?: string | null,
) {
  writeSealedText(STAFF_TOKEN_KEY, accessToken);
  if (refreshToken) {
    writeSealedText(STAFF_REFRESH_KEY, refreshToken);
  } else if (refreshToken === null) {
    removeSealed(STAFF_REFRESH_KEY);
  }
}

export function clearStaffSessionStorage() {
  try {
    removeSealed(STAFF_TOKEN_KEY);
    removeSealed(STAFF_REFRESH_KEY);
    removeSealed(STAFF_USER_KEY);
    localStorage.removeItem("rm_staff_token");
    localStorage.removeItem("rm_staff_user");
  } catch {
    /* ignore */
  }
  writeAccessCookie(null);
}
