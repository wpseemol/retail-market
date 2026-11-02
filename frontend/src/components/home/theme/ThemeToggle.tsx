"use client";

import { useSyncExternalStore } from "react";
import { useI18n } from "@/components/providers/LocaleProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";
import { SunIcon } from "./SunIcon";
import { MoonIcon } from "./MoonIcon";

const noopSubscribe = () => () => {};

type ThemeToggleProps = {
    className?: string;
};

/**
 * Vertical day / night switch — sun (top) & moon (bottom) with sliding thumb.
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
                    "inline-flex h-14 w-8 shrink-0 rounded-full bg-bg-subtle animate-pulse",
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
                "group relative inline-flex h-14 w-8 shrink-0 cursor-pointer items-start justify-center rounded-full p-1",
                "border border-brand-primary/25 transition-colors duration-300 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base",
                isDark ? "bg-brand-hover" : "bg-brand-tint",
                className,
            )}
        >
            {/* Track icons */}
            <span
                aria-hidden
                className={cn(
                    "pointer-events-none absolute left-1/2 top-1.5 -translate-x-1/2 transition-opacity duration-300",
                    isDark
                        ? "text-white/45 opacity-100"
                        : "text-brand-primary opacity-70",
                )}
            >
                <SunIcon className="size-3" />
            </span>
            <span
                aria-hidden
                className={cn(
                    "pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 transition-opacity duration-300",
                    isDark
                        ? "text-white opacity-80"
                        : "text-brand-primary/40 opacity-100",
                )}
            >
                <MoonIcon className="size-3" />
            </span>

            {/* Sliding thumb with active icon */}
            <span
                aria-hidden
                className={cn(
                    "relative z-10 flex size-6 items-center justify-center rounded-full bg-white shadow-sm",
                    "ring-1 ring-brand-primary/15",
                    "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    isDark ? "translate-y-[22px]" : "translate-y-0",
                )}
            >
                <span className="relative flex size-4 items-center justify-center text-brand-primary">
                    <span
                        className={cn(
                            "absolute inset-0 flex items-center justify-center transition-all duration-300",
                            isDark
                                ? "scale-50 opacity-0"
                                : "scale-100 opacity-100",
                        )}
                    >
                        <SunIcon className="size-3.5" />
                    </span>
                    <span
                        className={cn(
                            "absolute inset-0 flex items-center justify-center transition-all duration-300",
                            isDark
                                ? "scale-100 opacity-100"
                                : "scale-50 opacity-0",
                        )}
                    >
                        <MoonIcon className="size-3.5" />
                    </span>
                </span>
            </span>
        </button>
    );
}
