import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ApiUser } from "@/lib/api";

const TOKEN_KEY = "rm_customer_token";
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

type AuthState = {
  token: string | null;
  user: ApiUser | null;
  hydrated: boolean;
};

const initialState: AuthState = {
  token: null,
  user: null,
  hydrated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    hydrateAuth(state) {
      state.token = window.localStorage.getItem(TOKEN_KEY);
      state.user = readStorage<ApiUser>(USER_KEY);
      state.hydrated = true;
    },
    setCredentials(
      state,
      action: PayloadAction<{ token: string; user: ApiUser }>,
    ) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.hydrated = true;
      window.localStorage.setItem(TOKEN_KEY, action.payload.token);
      window.localStorage.setItem(USER_KEY, JSON.stringify(action.payload.user));
    },
    setUser(state, action: PayloadAction<ApiUser>) {
      state.user = action.payload;
      window.localStorage.setItem(USER_KEY, JSON.stringify(action.payload));
    },
    logout(state) {
      state.token = null;
      state.user = null;
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
    },
  },
});

export const { hydrateAuth, setCredentials, setUser, logout } = authSlice.actions;
export default authSlice.reducer;
