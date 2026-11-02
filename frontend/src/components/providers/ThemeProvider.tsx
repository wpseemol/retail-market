"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

export const THEME_STORAGE_KEY = "niyenin-theme";

type Theme = "light" | "dark";

type ThemeContextValue = {
    theme: Theme;
    resolvedTheme: Theme;
    setTheme: (theme: Theme | ((current: Theme) => Theme)) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

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

function readStoredTheme(): Theme {
    try {
        const raw = localStorage.getItem(THEME_STORAGE_KEY);
        if (raw === "dark" || raw === "light") return raw;
    } catch {
        /* ignore */
    }
    return "light";
}

/**
 * Brand theme provider (class on `<html>`).
 * Anti-FOUC runs from `/theme-init.js` via `next/script` `beforeInteractive`.
 *
 * Persistence: never write localStorage until after the stored value is read,
 * otherwise the default `"light"` state overwrites `"dark"` on reload (Strict Mode).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("light");
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const stored = readStoredTheme();
        setThemeState(stored);
        applyTheme(stored);
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        applyTheme(theme);
        try {
            localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch {
            /* ignore */
        }
    }, [theme, hydrated]);

    const setTheme = useCallback((next: Theme | ((current: Theme) => Theme)) => {
        setThemeState((current) => {
            const value = typeof next === "function" ? next(current) : next;
            return value === "dark" ? "dark" : "light";
        });
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
