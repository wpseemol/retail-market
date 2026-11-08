import { create } from "zustand";
import type { StaffUser } from "../lib/api";
import {
  clearStaffSessionStorage,
  readStaffAccessToken,
  readStaffRefreshToken,
  STAFF_USER_KEY,
  writeAccessCookie,
  writeStaffTokens,
} from "../lib/authKeys";
import { readSealedJson, writeSealedJson } from "../lib/secureStorage";

/**
 * Dashboard is Vite (not Next.js) — NextAuth cannot run here.
 * Tokens are kept sealed in sessionStorage (tab-scoped), not localStorage.
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
  return readSealedJson<StaffUser>(STAFF_USER_KEY);
}

const storedAccessToken = readStaffAccessToken();
writeAccessCookie(storedAccessToken);

export const useAuthStore = create<AuthState>((set, get) => ({
  token: storedAccessToken,
  refreshToken: readStaffRefreshToken(),
  user: readUser(),
  setSession: (token, user, refreshToken) => {
    const nextRefresh =
      refreshToken === undefined ? get().refreshToken : refreshToken;

    writeStaffTokens(token, nextRefresh ?? null);
    writeAccessCookie(token);
    writeSealedJson(STAFF_USER_KEY, user);
    set({ token, refreshToken: nextRefresh, user });
  },
  setUser: (user) => {
    writeSealedJson(STAFF_USER_KEY, user);
    set({ user });
  },
  logout: () => {
    clearStaffSessionStorage();
    set({ token: null, refreshToken: null, user: null });
  },
}));
