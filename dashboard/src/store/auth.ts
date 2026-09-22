import { create } from "zustand";
import type { StaffUser } from "../lib/api";
import {
  STAFF_REFRESH_KEY,
  STAFF_TOKEN_KEY,
  STAFF_USER_KEY,
  clearStaffSessionStorage,
} from "../lib/authKeys";

/**
 * Dashboard is Vite (not Next.js) — NextAuth cannot run here.
 * Tokens are kept in sessionStorage (tab-scoped), not localStorage.
 * When refresh token expires/fails → logout (secure staff sessions).
 */

type AuthState = {
  token: string | null;
  refreshToken: string | null;
  user: StaffUser | null;
  setSession: (
    token: string,
    user: StaffUser,
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

export const useAuthStore = create<AuthState>((set) => ({
  token: sessionStorage.getItem(STAFF_TOKEN_KEY),
  refreshToken: sessionStorage.getItem(STAFF_REFRESH_KEY),
  user: readUser(),
  setSession: (token, user, refreshToken = null) => {
    clearStaffSessionStorage();
    sessionStorage.setItem(STAFF_TOKEN_KEY, token);
    if (refreshToken) {
      sessionStorage.setItem(STAFF_REFRESH_KEY, refreshToken);
    } else {
      sessionStorage.removeItem(STAFF_REFRESH_KEY);
    }
    sessionStorage.setItem(STAFF_USER_KEY, JSON.stringify(user));
    set({ token, refreshToken, user });
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
