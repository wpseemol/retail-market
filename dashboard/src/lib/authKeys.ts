/**
 * Session storage keys for dashboard staff auth.
 * Kept separate so api + store can share without circular imports.
 */
export const STAFF_TOKEN_KEY = "rm_staff_access_token";
export const STAFF_REFRESH_KEY = "rm_staff_refresh_token";
export const STAFF_USER_KEY = "rm_staff_user";

export function clearStaffSessionStorage() {
  try {
    sessionStorage.removeItem(STAFF_TOKEN_KEY);
    sessionStorage.removeItem(STAFF_REFRESH_KEY);
    sessionStorage.removeItem(STAFF_USER_KEY);
    localStorage.removeItem("rm_staff_token");
    localStorage.removeItem("rm_staff_user");
  } catch {
    /* ignore */
  }
}
