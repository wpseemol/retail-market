"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { useI18n } from "@/components/providers/LocaleProvider";
import { cn } from "@/lib/utils";
import { SunIcon } from "./SunIcon";
import { MoonIcon } from "./MoonIcon";

const noopSubscribe = () => () => {};

type ThemeToggleProps = {
    className?: string;
};

/**
 * Day / night theme switch — solid brand colors, sliding thumb with sun/moon.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
    const { t } = useI18n();
    const { resolvedTheme, setTheme } = useTheme();
    const mounted = useSyncExternalStore(
        noopSubscribe,
        () => true,
        () => false,
    );

    if (!mounted) {
        return (
            <span
                className={cn(
                    "inline-flex h-9 w-16 shrink-0 rounded-full bg-bg-subtle animate-pulse",
                    className,
                )}
                aria-hidden
            />
        );
    }

    const isDark = resolvedTheme === "dark";

    return (
        <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? t.header.lightTheme : t.header.darkTheme}
            aria-pressed={isDark}
            className={cn(
                "group relative inline-flex h-9 w-16 shrink-0 cursor-pointer items-center rounded-full p-1",
                "border border-brand-primary/25 transition-colors duration-300 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base",
                isDark ? "bg-brand-hover" : "bg-brand-tint",
                className,
            )}
        >
            {/* Static track hints */}
            <span
                aria-hidden
                className={cn(
                    "pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 transition-opacity duration-300",
                    isDark
                        ? "text-white/45 opacity-100"
                        : "text-brand-primary opacity-70",
                )}
            >
                <SunIcon className="size-3.5" />
            </span>
            <span
                aria-hidden
                className={cn(
                    "pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 transition-opacity duration-300",
                    isDark
                        ? "text-white opacity-80"
                        : "text-brand-primary/40 opacity-100",
                )}
            >
                <MoonIcon className="size-3.5" />
            </span>

            {/* Sliding thumb with the active icon */}
            <span
                aria-hidden
                className={cn(
                    "relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm",
                    "ring-1 ring-brand-primary/15",
                    "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    isDark ? "translate-x-[30px]" : "translate-x-0",
                )}
            >
                <span className="relative flex h-5 w-5 items-center justify-center text-brand-primary">
                    <span
                        className={cn(
                            "absolute inset-0 flex items-center justify-center transition-all duration-300",
                            isDark
                                ? "rotate-90 scale-50 opacity-0"
                                : "rotate-0 scale-100 opacity-100",
                        )}
                    >
                        <SunIcon className="size-4" />
                    </span>
                    <span
                        className={cn(
                            "absolute inset-0 flex items-center justify-center transition-all duration-300",
                            isDark
                                ? "rotate-0 scale-100 opacity-100"
                                : "-rotate-90 scale-50 opacity-0",
                        )}
                    >
                        <MoonIcon className="size-4" />
                    </span>
                </span>
            </span>
        </button>
    );
}
