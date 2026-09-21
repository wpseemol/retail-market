import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ApiUser } from "@/lib/api";

/**
 * Client auth state — UI only.
 *
 * Tokens are NOT kept in localStorage or readable cookies.
 * After login, JWTs live in the encrypted httpOnly `rm_session` cookie
 * (set by Server Actions). That is the standard, safer approach:
 * JS cannot read/steal the token (XSS-resistant).
 *
 * Redux only mirrors the public user profile for Header / account UI.
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
  window.localStorage.removeItem("rm_customer_token");
  window.localStorage.removeItem("rm_customer_refresh_token");
  window.localStorage.removeItem("rm_customer_user");
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
export default authSlice.reducer;
