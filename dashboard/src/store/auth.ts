import { create } from "zustand";
import type { StaffUser } from "../lib/api";

const TOKEN_KEY = "rm_staff_token";
const USER_KEY = "rm_staff_user";

type AuthState = {
  token: string | null;
  user: StaffUser | null;
  setSession: (token: string, user: StaffUser) => void;
  logout: () => void;
};

function readUser(): StaffUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as StaffUser) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: readUser(),
  setSession: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null });
  },
}));
