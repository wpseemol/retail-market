"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  type Transition,
} from "framer-motion";

const EASE: Transition["ease"] = [0.22, 1, 0.36, 1];

/**
 * One-shot page enter (bottom → top). Used in `app/template.tsx` so it
 * remounts on every navigation. Does not hide on scroll (whole-page
 * scroll-away would blank the site).
 */
export function PageEnter({
  children,
  className,
  distance = 40,
  delay = 0.04,
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (reduceMotion) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      setReady(true);
      setVisible(false);
      raf2 = requestAnimationFrame(() => setVisible(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [reduceMotion]);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={false}
      animate={
        !ready || visible
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: distance }
      }
      transition={
        !ready
          ? { duration: 0 }
          : visible
            ? { duration: 0.65, ease: EASE, delay }
            : { duration: 0 }
      }
    >
      {children}
    </motion.div>
  );
}
