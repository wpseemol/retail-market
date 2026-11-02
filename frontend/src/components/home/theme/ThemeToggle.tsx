"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useI18n } from "@/components/providers/LocaleProvider";
import { cn } from "@/lib/utils";
import { SunIcon } from "./SunIcon";
import { MoonIcon } from "./MoonIcon";

const noopSubscribe = () => () => {};

type ThemeToggleProps = {
    className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
    const { t } = useI18n();
    const { theme, setTheme } = useTheme();
    const reduceMotion = useReducedMotion();
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

    const isDark = theme === "dark";

    return (
        <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? t.header.lightTheme : t.header.darkTheme}
            aria-pressed={isDark}
            className={cn(
                "relative inline-flex h-9 w-16 shrink-0 items-center rounded-full p-1 transition-colors duration-300",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base",
                isDark ? "bg-brand-primary" : "bg-[#4D4D4D]",
                className,
            )}
        >
            {/* Track icons */}
            <span
                className={cn(
                    "pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-amber-300 transition-opacity duration-300",
                    isDark ? "opacity-40" : "opacity-100",
                )}
            >
                <SunIcon className="size-3.5" />
            </span>
            <span
                className={cn(
                    "pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white transition-opacity duration-300",
                    isDark ? "opacity-100" : "opacity-40",
                )}
            >
                <MoonIcon className="size-3.5" />
            </span>

            {/* Sliding thumb with animated sun/moon */}
            <motion.span
                layout
                transition={
                    reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 420, damping: 28 }
                }
                className={cn(
                    "relative z-10 flex size-7 items-center justify-center rounded-full bg-white text-[#4D4D4D] shadow-md",
                    isDark ? "ml-auto" : "ml-0",
                )}
            >
                <AnimatePresence mode="wait" initial={false}>
                    {isDark ? (
                        <motion.span
                            key="moon"
                            initial={
                                reduceMotion
                                    ? false
                                    : { rotate: -90, scale: 0.4, opacity: 0 }
                            }
                            animate={{ rotate: 0, scale: 1, opacity: 1 }}
                            exit={
                                reduceMotion
                                    ? undefined
                                    : { rotate: 90, scale: 0.4, opacity: 0 }
                            }
                            transition={{ duration: 0.22 }}
                            className="flex text-[#1e293b]"
                        >
                            <MoonIcon className="size-4" />
                        </motion.span>
                    ) : (
                        <motion.span
                            key="sun"
                            initial={
                                reduceMotion
                                    ? false
                                    : { rotate: 90, scale: 0.4, opacity: 0 }
                            }
                            animate={{ rotate: 0, scale: 1, opacity: 1 }}
                            exit={
                                reduceMotion
                                    ? undefined
                                    : { rotate: -90, scale: 0.4, opacity: 0 }
                            }
                            transition={{ duration: 0.22 }}
                            className="flex text-amber-500"
                        >
                            <SunIcon className="size-4" />
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.span>
        </button>
    );
}
