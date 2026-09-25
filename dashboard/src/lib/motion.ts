/**
 * Lightweight Framer Motion presets for the dashboard.
 * Prefer these over ad-hoc animations so motion stays consistent and cheap.
 *
 * Memory / perf rules:
 * - Use LazyMotion + `m` (not `motion`) so the heavy feature set stays out of
 *   the main bundle until needed (`domAnimation` only — no layout/gestures).
 * - Prefer opacity + translateY only (GPU-friendly, no layout thrash).
 * - Cap stagger children; never AnimatePresence whole tables.
 * - Always respect prefers-reduced-motion via `useMotionSafe()`.
 */
import type { Transition, Variants } from "framer-motion";

export const MOTION_EASE = [0.22, 1, 0.36, 1] as const;

export const motionTransition: Transition = {
  duration: 0.35,
  ease: MOTION_EASE,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: motionTransition,
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.28, ease: MOTION_EASE },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.04,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: motionTransition,
  },
};

/** Instant variants when the user prefers reduced motion. */
export const reducedVariants: Variants = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0 },
};
