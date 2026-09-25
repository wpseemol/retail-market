import type { ReactNode } from "react";
import {
  LazyMotion,
  domAnimation,
  m,
  useReducedMotion,
  type HTMLMotionProps,
} from "framer-motion";
import {
  fadeIn,
  fadeUp,
  reducedVariants,
  staggerContainer,
  staggerItem,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Load only the `domAnimation` feature set (no layout/gestures). */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}

export function useMotionSafe() {
  const reduce = useReducedMotion();
  return {
    reduce: !!reduce,
    fadeUp: reduce ? reducedVariants : fadeUp,
    fadeIn: reduce ? reducedVariants : fadeIn,
    staggerContainer: reduce ? reducedVariants : staggerContainer,
    staggerItem: reduce ? reducedVariants : staggerItem,
  };
}

type MotionDivProps = HTMLMotionProps<"div"> & {
  className?: string;
};

/** Page / section enter — opacity + slight rise. */
export function FadeUp({ className, children, ...props }: MotionDivProps) {
  const { fadeUp: variants } = useMotionSafe();
  return (
    <m.div
      initial="hidden"
      animate="show"
      variants={variants}
      className={className}
      {...props}
    >
      {children}
    </m.div>
  );
}

/** Soft opacity-only enter (cheapest). */
export function FadeIn({ className, children, ...props }: MotionDivProps) {
  const { fadeIn: variants } = useMotionSafe();
  return (
    <m.div
      initial="hidden"
      animate="show"
      variants={variants}
      className={className}
      {...props}
    >
      {children}
    </m.div>
  );
}

/** Parent for staggered children — keep lists small. */
export function Stagger({ className, children, ...props }: MotionDivProps) {
  const { staggerContainer: variants } = useMotionSafe();
  return (
    <m.div
      initial="hidden"
      animate="show"
      variants={variants}
      className={cn(className)}
      {...props}
    >
      {children}
    </m.div>
  );
}

export function StaggerItem({ className, children, ...props }: MotionDivProps) {
  const { staggerItem: variants } = useMotionSafe();
  return (
    <m.div variants={variants} className={className} {...props}>
      {children}
    </m.div>
  );
}

export { m };
