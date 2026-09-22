import { create } from "zustand";
import type { StaffUser } from "../lib/api";

/**
 * Dashboard is Vite (not Next.js) — NextAuth cannot run here.
 * Tokens are kept in sessionStorage (tab-scoped), not localStorage.
 * Prefer migrating dashboard to Next.js later for Auth.js httpOnly cookies.
 */
const TOKEN_KEY = "rm_staff_access_token";
const REFRESH_KEY = "rm_staff_refresh_token";
const USER_KEY = "rm_staff_user";

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
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as StaffUser) : null;
  } catch {
    return null;
  }
}

function clearLegacyLocalStorage() {
  try {
    localStorage.removeItem("rm_staff_token");
    localStorage.removeItem("rm_staff_user");
  } catch {
    /* ignore */
  }
}

clearLegacyLocalStorage();

export const useAuthStore = create<AuthState>((set) => ({
  token: sessionStorage.getItem(TOKEN_KEY),
  refreshToken: sessionStorage.getItem(REFRESH_KEY),
  user: readUser(),
  setSession: (token, user, refreshToken = null) => {
    clearLegacyLocalStorage();
    sessionStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) {
      sessionStorage.setItem(REFRESH_KEY, refreshToken);
    } else {
      sessionStorage.removeItem(REFRESH_KEY);
    }
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, refreshToken, user });
  },
  setUser: (user) => {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user });
  },
  logout: () => {
    clearLegacyLocalStorage();
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(USER_KEY);
    set({ token: null, refreshToken: null, user: null });
  },
}));
