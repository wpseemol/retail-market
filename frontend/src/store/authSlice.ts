import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ApiUser } from "@/lib/api";

const ACCESS_TOKEN_KEY = "rm_customer_token";
const REFRESH_TOKEN_KEY = "rm_customer_refresh_token";
const USER_KEY = "rm_customer_user";

function readStorage<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type AuthState = {
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

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    hydrateAuth(state) {
      state.token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
      state.refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);
      state.user = readStorage<ApiUser>(USER_KEY);
      state.hydrated = true;
    },
    setCredentials(
      state,
      action: PayloadAction<{
        accessToken?: string;
        refreshToken?: string;
        /** Legacy single-token field from older API responses. */
        token?: string;
        user: ApiUser;
      }>,
    ) {
      const access =
        action.payload.accessToken ?? action.payload.token ?? null;
      const refresh = action.payload.refreshToken ?? state.refreshToken;

      state.token = access;
      state.refreshToken = refresh ?? null;
      state.user = action.payload.user;
      state.hydrated = true;

      if (access) {
        window.localStorage.setItem(ACCESS_TOKEN_KEY, access);
      }
      if (refresh) {
        window.localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
      }
      window.localStorage.setItem(USER_KEY, JSON.stringify(action.payload.user));
    },
    setTokens(state, action: PayloadAction<AuthTokens>) {
      state.token = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      window.localStorage.setItem(
        ACCESS_TOKEN_KEY,
        action.payload.accessToken,
      );
      window.localStorage.setItem(
        REFRESH_TOKEN_KEY,
        action.payload.refreshToken,
      );
    },
    setUser(state, action: PayloadAction<ApiUser>) {
      state.user = action.payload;
      window.localStorage.setItem(USER_KEY, JSON.stringify(action.payload));
    },
    logout(state) {
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
    },
  },
});

export const { hydrateAuth, setCredentials, setTokens, setUser, logout } =
  authSlice.actions;
export default authSlice.reducer;

export function readStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function persistAuthTokens(tokens: AuthTokens) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}
