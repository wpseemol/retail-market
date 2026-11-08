import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ApiUser } from "@/lib/api";
import { scrubLegacyAuthLocalStorage } from "@/lib/secureLocalStorage";

/**
 * Client auth state — UI only.
 *
 * Tokens are NOT kept in localStorage or readable cookies.
 * After login, JWTs live in the Auth.js httpOnly session cookie
 * (`authjs.session-token` / `__Secure-authjs.session-token`).
 * JS cannot read/steal the token (XSS-resistant).
 *
 * Redux only mirrors the public user profile for Header / account UI.
 * Root layout seeds that profile from `auth()` so reload skips the skeleton.
 */
type AuthState = {
  user: ApiUser | null;
  /** True after we have read the httpOnly session (or confirmed none). */
  hydrated: boolean;
};

const initialState: AuthState = {
  user: null,
  hydrated: false,
};

/** One-time cleanup of older localStorage / plain cookie auth (no longer used). */
function clearLegacyClientStorage() {
  if (typeof window === "undefined") return;
  scrubLegacyAuthLocalStorage();
  for (const name of [
    "rm_access_token",
    "rm_refresh_token",
    "rm_customer_user",
  ]) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    hydrateAuth(state) {
      clearLegacyClientStorage();
      state.hydrated = true;
    },
    setSessionUser(state, action: PayloadAction<ApiUser | null>) {
      clearLegacyClientStorage();
      state.user = action.payload;
      state.hydrated = true;
    },
    /** After login/register — user only; tokens already in httpOnly cookie. */
    setCredentials(state, action: PayloadAction<{ user: ApiUser }>) {
      clearLegacyClientStorage();
      state.user = action.payload.user;
      state.hydrated = true;
    },
    setUser(state, action: PayloadAction<ApiUser>) {
      state.user = action.payload;
    },
    logout(state) {
      clearLegacyClientStorage();
      state.user = null;
    },
  },
});

export const { hydrateAuth, setSessionUser, setCredentials, setUser, logout } =
  authSlice.actions;

export const selectAuthUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAuthHydrated = (state: { auth: AuthState }) =>
  state.auth.hydrated;

export default authSlice.reducer;
