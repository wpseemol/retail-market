"use client";

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useSyncExternalStore,
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
    return "light";
}

/**
 * Brand theme provider (class on `<html>`).
 * Anti-FOUC runs from `/theme-init.js` via `next/script` `beforeInteractive`.
 * Theme is stored in localStorage and read via `useSyncExternalStore` (no
 * hydrate-write race that reset dark → light on reload).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
    const theme = useSyncExternalStore(
        subscribeTheme,
        getThemeSnapshot,
        getServerThemeSnapshot,
    );

    const setTheme = useCallback((next: Theme | ((current: Theme) => Theme)) => {
        const current = readStoredTheme();
        const value =
            typeof next === "function" ? next(current) : next;
        const resolved = value === "dark" ? "dark" : "light";
        try {
            localStorage.setItem(THEME_STORAGE_KEY, resolved);
        } catch {
            /* ignore */
        }
        applyTheme(resolved);
        // Notify same-tab subscribers (storage events only fire cross-tab).
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
