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
import { useServerInsertedHTML } from "next/navigation";

const STORAGE_KEY = "niyenin-theme";

type Theme = "light" | "dark";

type ThemeContextValue = {
    theme: Theme;
    resolvedTheme: Theme;
    setTheme: (theme: Theme | ((current: Theme) => Theme)) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Runs in the SSR HTML stream (not as a client React `<script>`) to avoid FOUC. */
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||"light";var d=document.documentElement;if(t==="dark"){d.classList.add("dark");d.style.colorScheme="dark"}else{d.classList.remove("dark");d.style.colorScheme="light"}}catch(e){}})();`;

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

/**
 * Brand theme provider (class on `<html>`).
 * Avoids `next-themes` React 19 “script tag while rendering” warning by injecting
 * the anti-FOUC script with `useServerInsertedHTML` instead of a client `<script>`.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("light");

    useServerInsertedHTML(() => (
        <script
            id="niyenin-theme-init"
            dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
    ));

    useEffect(() => {
        let stored: Theme = "light";
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw === "dark" || raw === "light") stored = raw;
        } catch {
            /* ignore */
        }
        setThemeState(stored);
        applyTheme(stored);
    }, []);

    useEffect(() => {
        applyTheme(theme);
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            /* ignore */
        }
    }, [theme]);

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
