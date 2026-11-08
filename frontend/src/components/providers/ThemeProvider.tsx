"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  parseTheme,
  themeCookieHeader,
  THEME_COOKIE_KEY,
  THEME_STORAGE_KEY,
  type Theme,
} from "@/lib/theme";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: Theme;
  setTheme: (theme: Theme | ((current: Theme) => Theme)) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export { THEME_STORAGE_KEY };

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }
}

function persistTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  try {
    document.cookie = themeCookieHeader(theme);
  } catch {
    /* ignore */
  }
}

function readStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "dark" || raw === "light") return raw;
  } catch {
    /* ignore */
  }
  try {
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${THEME_COOKIE_KEY}=([^;]*)`),
    );
    if (match?.[1]) return parseTheme(decodeURIComponent(match[1]));
  } catch {
    /* ignore */
  }
  return "light";
}

function subscribeTheme(onStoreChange: () => void) {
  const handler = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) {
      onStoreChange();
    }
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function getThemeSnapshot(): Theme {
  return readStoredTheme();
}

function getServerThemeSnapshot(): Theme {
  // Cookie-driven SSR class on <html> is the source of truth for first paint.
  return "light";
}

/**
 * Brand theme provider (class on `<html>`).
 * Anti-FOUC: cookie on SSR + blocking head script + localStorage.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  const setTheme = useCallback((next: Theme | ((current: Theme) => Theme)) => {
    const current = readStoredTheme();
    const value = typeof next === "function" ? next(current) : next;
    const resolved = value === "dark" ? "dark" : "light";
    persistTheme(resolved);
    applyTheme(resolved);
    window.dispatchEvent(
      new StorageEvent("storage", { key: THEME_STORAGE_KEY }),
    );
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme: theme,
      setTheme,
    }),
    [theme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "light" as Theme,
      resolvedTheme: "light" as Theme,
      setTheme: (_theme: Theme | ((current: Theme) => Theme)) => {},
    };
  }
  return ctx;
}
