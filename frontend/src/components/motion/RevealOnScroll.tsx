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
 * Bottom → top reveal. Hides when scrolled away; plays again when it
 * reappears. SSR stays visible for SEO until the client takes over.
 */
export function RevealOnScroll({
  children,
  delay = 0,
  className,
  distance = 56,
}: RevealProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, {
    once: false,
    amount: 0.2,
    margin: "0px 0px -5% 0px",
  });
  const wasInView = useRef(false);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (reduceMotion) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion || !ready) return;

    // Entering viewport → snap hidden, then rise in.
    if (inView && !wasInView.current) {
      wasInView.current = true;
      setVisible(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }

    // Leaving viewport → hide so the next enter can animate again.
    if (!inView && wasInView.current) {
      wasInView.current = false;
      setVisible(false);
    }
  }, [inView, ready, reduceMotion]);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
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
            ? { duration: 0.7, ease: EASE, delay }
            : { duration: 0.35, ease: EASE }
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

export function RevealItem({
  children,
  index = 0,
  className,
}: RevealItemProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: false, amount: 0.25 });
  const wasInView = useRef(false);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (reduceMotion) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion || !ready) return;

    if (inView && !wasInView.current) {
      wasInView.current = true;
      setVisible(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }

    if (!inView && wasInView.current) {
      wasInView.current = false;
      setVisible(false);
    }
  }, [inView, ready, reduceMotion]);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={
        !ready || visible
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: 36 }
      }
      transition={
        !ready
          ? { duration: 0 }
          : visible
            ? {
                duration: 0.55,
                ease: EASE,
                delay: Math.min(index * 0.08, 0.4),
              }
            : { duration: 0.28, ease: EASE }
      }
    >
      {children}
    </motion.div>
  );
}
