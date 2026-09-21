import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ApiUser } from "@/lib/api";

type AuthState = {
  /** Access token is never stored in the client — httpOnly cookie only. */
  token: string | null;
  refreshToken: string | null;
  user: ApiUser | null;
  hydrated: boolean;
};

const initialState: AuthState = {
  token: null,
  refreshToken: null,
  user: null,
  hydrated: false,
};

function clearLegacyClientStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("rm_customer_token");
  window.localStorage.removeItem("rm_customer_refresh_token");
  window.localStorage.removeItem("rm_customer_user");
  // Clear old readable cookies if any remain.
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
    /** Mark hydration complete without trusting client-readable token storage. */
    hydrateAuth(state) {
      clearLegacyClientStorage();
      state.token = null;
      state.refreshToken = null;
      state.hydrated = true;
    },
    setSessionUser(state, action: PayloadAction<ApiUser | null>) {
      state.user = action.payload;
      state.token = action.payload ? "cookie" : null;
      state.hydrated = true;
    },
    setCredentials(
      state,
      action: PayloadAction<{
        user: ApiUser;
        accessToken?: string;
        refreshToken?: string;
        token?: string;
      }>,
    ) {
      clearLegacyClientStorage();
      state.user = action.payload.user;
      // Sentinel only — real JWT stays in encrypted httpOnly `rm_session`.
      state.token = "cookie";
      state.refreshToken = null;
      state.hydrated = true;
    },
    setUser(state, action: PayloadAction<ApiUser>) {
      state.user = action.payload;
    },
    logout(state) {
      clearLegacyClientStorage();
      state.token = null;
      state.refreshToken = null;
      state.user = null;
    },
  },
});

export const { hydrateAuth, setSessionUser, setCredentials, setUser, logout } =
  authSlice.actions;
export default authSlice.reducer;
