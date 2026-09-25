"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  type Transition,
} from "framer-motion";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
  distance?: number;
};

const EASE: Transition["ease"] = [0.22, 1, 0.36, 1];

/**
 * Bottom → top reveal — plays **once** the first time the block enters view.
 * Stays visible after that (no hide / replay on scroll). SSR stays visible for SEO.
 */
export function RevealOnScroll({
  children,
  delay = 0,
  className,
  distance = 48,
}: RevealProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, {
    once: true,
    amount: 0.15,
    margin: "0px 0px -6% 0px",
  });
  const [ready, setReady] = useState(false);
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion || !ready || played || !inView) return;
    // Snap to hidden for one frame, then rise in (so motion is visible).
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPlayed(true));
    });
    return () => cancelAnimationFrame(id);
  }, [inView, ready, played, reduceMotion]);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  // Before client ready: fully visible (SEO / no blank crawl).
  const show = !ready || played;
  // Armed (ready but not yet played): briefly hidden until first in-view play.
  const hidden = ready && !played;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={
        show
          ? { opacity: 1, y: 0 }
          : hidden
            ? { opacity: 0, y: distance }
            : { opacity: 1, y: 0 }
      }
      transition={
        played
          ? { duration: 0.7, ease: EASE, delay }
          : { duration: 0 }
      }
    >
      {children}
    </motion.div>
  );
}

type RevealItemProps = {
  children: ReactNode;
  index?: number;
  className?: string;
};

/** Staggered child rise — once only. */
export function RevealItem({
  children,
  index = 0,
  className,
}: RevealItemProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const [ready, setReady] = useState(false);
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion || !ready || played || !inView) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPlayed(true));
    });
    return () => cancelAnimationFrame(id);
  }, [inView, ready, played, reduceMotion]);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const show = !ready || played;
  const hidden = ready && !played;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={
        show
          ? { opacity: 1, y: 0 }
          : hidden
            ? { opacity: 0, y: 32 }
            : { opacity: 1, y: 0 }
      }
      transition={
        played
          ? {
              duration: 0.55,
              ease: EASE,
              delay: Math.min(index * 0.08, 0.4),
            }
          : { duration: 0 }
      }
    >
      {children}
    </motion.div>
  );
}
