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
    const { resolvedTheme, setTheme } = useTheme();
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
                    "inline-flex h-9 w-[4.25rem] shrink-0 rounded-full bg-bg-subtle animate-pulse",
                    className,
                )}
                aria-hidden
            />
        );
    }

    const isDark = resolvedTheme === "dark";
    const spring = reduceMotion
        ? { duration: 0 }
        : { type: "spring" as const, stiffness: 380, damping: 26 };

    return (
        <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? t.header.lightTheme : t.header.darkTheme}
            aria-pressed={isDark}
            className={cn(
                "relative inline-flex h-9 w-[4.25rem] shrink-0 cursor-pointer items-center overflow-hidden rounded-full p-1",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base",
                className,
            )}
        >
            {/* Day / night sky */}
            <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full"
                initial={false}
                animate={{
                    background: isDark
                        ? "linear-gradient(135deg, #0f172a 0%, #1e3a5f 55%, #312e81 100%)"
                        : "linear-gradient(135deg, #38bdf8 0%, #7dd3fc 45%, #fde68a 100%)",
                }}
                transition={{ duration: reduceMotion ? 0 : 0.45 }}
            />

            {/* Stars — only in night */}
            <AnimatePresence>
                {isDark ? (
                    <motion.span
                        key="stars"
                        aria-hidden
                        className="pointer-events-none absolute inset-0"
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <span className="absolute left-2 top-2 size-0.5 rounded-full bg-white/90" />
                        <span className="absolute left-4 top-5 size-1 rounded-full bg-white/70" />
                        <span className="absolute left-3.5 top-3 size-0.5 rounded-full bg-white/80" />
                    </motion.span>
                ) : null}
            </AnimatePresence>

            {/* Sliding sun / moon thumb */}
            <motion.span
                aria-hidden
                className="relative z-10 flex size-7 items-center justify-center rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
                initial={false}
                animate={{
                    x: isDark ? 32 : 0,
                    backgroundColor: isDark ? "#e2e8f0" : "#fbbf24",
                }}
                transition={spring}
            >
                <AnimatePresence mode="wait" initial={false}>
                    {isDark ? (
                        <motion.span
                            key="moon"
                            className="flex text-slate-700"
                            initial={
                                reduceMotion
                                    ? false
                                    : { rotate: -110, scale: 0.35, opacity: 0 }
                            }
                            animate={{ rotate: 0, scale: 1, opacity: 1 }}
                            exit={
                                reduceMotion
                                    ? undefined
                                    : { rotate: 80, scale: 0.35, opacity: 0 }
                            }
                            transition={{ duration: 0.28 }}
                        >
                            <MoonIcon size={16} />
                        </motion.span>
                    ) : (
                        <motion.span
                            key="sun"
                            className="flex text-amber-700"
                            initial={
                                reduceMotion
                                    ? false
                                    : { rotate: 110, scale: 0.35, opacity: 0 }
                            }
                            animate={{ rotate: 0, scale: 1, opacity: 1 }}
                            exit={
                                reduceMotion
                                    ? undefined
                                    : { rotate: -80, scale: 0.35, opacity: 0 }
                            }
                            transition={{ duration: 0.28 }}
                        >
                            <SunIcon size={16} />
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.span>
        </button>
    );
}
