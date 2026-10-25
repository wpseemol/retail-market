import { create } from "zustand";
import type { StaffUser } from "../lib/api";
import {
  STAFF_REFRESH_KEY,
  STAFF_TOKEN_KEY,
  STAFF_USER_KEY,
  clearStaffSessionStorage,
  writeAccessCookie,
} from "../lib/authKeys";

/**
 * Dashboard is Vite (not Next.js) — NextAuth cannot run here.
 * Tokens are kept in sessionStorage (tab-scoped), not localStorage.
 * The access token is also copied into a same-origin cookie for the API proxy.
 * When refresh token expires/fails → logout (secure staff sessions).
 */

type AuthState = {
  token: string | null;
  refreshToken: string | null;
  user: StaffUser | null;
  setSession: (
    token: string,
    user: StaffUser,
    /** Pass explicitly on login/refresh. Omit to keep the current refresh token. */
    refreshToken?: string | null,
  ) => void;
  setUser: (user: StaffUser) => void;
  logout: () => void;
};

function readUser(): StaffUser | null {
  try {
    const raw = sessionStorage.getItem(STAFF_USER_KEY);
    return raw ? (JSON.parse(raw) as StaffUser) : null;
  } catch {
    return null;
  }
}

const storedAccessToken = sessionStorage.getItem(STAFF_TOKEN_KEY);
writeAccessCookie(storedAccessToken);

export const useAuthStore = create<AuthState>((set, get) => ({
  token: storedAccessToken,
  refreshToken: sessionStorage.getItem(STAFF_REFRESH_KEY),
  user: readUser(),
  setSession: (token, user, refreshToken) => {
    const nextRefresh =
      refreshToken === undefined ? get().refreshToken : refreshToken;

    sessionStorage.setItem(STAFF_TOKEN_KEY, token);
    writeAccessCookie(token);
    if (nextRefresh) {
      sessionStorage.setItem(STAFF_REFRESH_KEY, nextRefresh);
    } else {
      sessionStorage.removeItem(STAFF_REFRESH_KEY);
    }
    sessionStorage.setItem(STAFF_USER_KEY, JSON.stringify(user));
    set({ token, refreshToken: nextRefresh, user });
  },
  setUser: (user) => {
    sessionStorage.setItem(STAFF_USER_KEY, JSON.stringify(user));
    set({ user });
  },
  logout: () => {
    clearStaffSessionStorage();
    set({ token: null, refreshToken: null, user: null });
  },
}));
