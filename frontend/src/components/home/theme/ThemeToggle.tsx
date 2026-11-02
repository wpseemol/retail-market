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
 * Day / night theme switch — sun & moon icons slide with the thumb.
 * Uses CSS transitions (no framer dependency) so icons always paint.
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
                "transition-[background] duration-500 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base",
                isDark
                    ? "bg-[linear-gradient(135deg,#0f172a_0%,#1e3a5f_50%,#312e81_100%)]"
                    : "bg-[linear-gradient(135deg,#38bdf8_0%,#7dd3fc_40%,#fde68a_100%)]",
                className,
            )}
        >
            {/* Static track hints */}
            <span
                aria-hidden
                className={cn(
                    "pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-amber-200 transition-opacity duration-300",
                    isDark ? "opacity-35" : "opacity-90",
                )}
            >
                <SunIcon size={12} />
            </span>
            <span
                aria-hidden
                className={cn(
                    "pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white transition-opacity duration-300",
                    isDark ? "opacity-90" : "opacity-35",
                )}
            >
                <MoonIcon size={12} />
            </span>

            {/* Night stars */}
            <span
                aria-hidden
                className={cn(
                    "pointer-events-none absolute inset-0 transition-opacity duration-500",
                    isDark ? "opacity-100" : "opacity-0",
                )}
            >
                <span className="absolute left-[10px] top-[8px] h-0.5 w-0.5 rounded-full bg-white" />
                <span className="absolute left-[18px] top-[18px] h-1 w-1 rounded-full bg-white/80" />
                <span className="absolute left-[14px] top-[12px] h-0.5 w-0.5 rounded-full bg-white/90" />
            </span>

            {/* Sliding thumb with the active icon */}
            <span
                aria-hidden
                className={cn(
                    "relative z-10 flex h-7 w-7 items-center justify-center rounded-full shadow-md",
                    "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    isDark
                        ? "translate-x-[30px] bg-slate-100 text-slate-800"
                        : "translate-x-0 bg-amber-300 text-amber-800",
                )}
            >
                {/* Both icons stacked; cross-fade + rotate on switch */}
                <span className="relative flex h-5 w-5 items-center justify-center">
                    <span
                        className={cn(
                            "absolute inset-0 flex items-center justify-center transition-all duration-300",
                            isDark
                                ? "rotate-90 scale-50 opacity-0"
                                : "rotate-0 scale-100 opacity-100",
                        )}
                    >
                        <SunIcon size={18} />
                    </span>
                    <span
                        className={cn(
                            "absolute inset-0 flex items-center justify-center transition-all duration-300",
                            isDark
                                ? "rotate-0 scale-100 opacity-100"
                                : "-rotate-90 scale-50 opacity-0",
                        )}
                    >
                        <MoonIcon size={18} />
                    </span>
                </span>
            </span>
        </button>
    );
}
