"use client";

import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";

// The site disables CSS animations/transitions and framer-motion globally, so the
// login <-> register switch uses the Web Animations API, which neither switch affects.

export type AuthMode = "login" | "register";

export const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/** Register sits to the right of Login, so entering it always moves forward. */
export const modeDirection = (mode: AuthMode) => (mode === "register" ? 1 : -1);

function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function settle(anim: Animation, ms: number) {
    // Hidden tabs can stall animation timelines; never leave the UI mid-swap.
    return Promise.race([
        anim.finished.then(() => undefined, () => undefined),
        new Promise<void>((resolve) => setTimeout(resolve, ms + 80)),
    ]);
}

export type SwapVariant = {
    exit: (dir: number) => Keyframe[];
    enter: (dir: number) => Keyframe[];
    exitMs: number;
    enterMs: number;
    /** Lets a resizing container lead before the new content appears. */
    enterDelay?: number;
    /** Children matching this selector fade in one after another on enter. */
    stagger?: string;
};

/**
 * Keeps rendering the previous mode while its exit animation plays, then swaps
 * in the new mode and plays the enter animation.
 */
export function useModeSwap(mode: AuthMode, variant: SwapVariant) {
    const [shown, setShown] = useState(mode);
    const ref = useRef<HTMLDivElement>(null);
    const mounted = useRef(false);

    useEffect(() => {
        if (mode === shown) return;
        const el = ref.current;
        const ms = !el || prefersReducedMotion() ? 0 : variant.exitMs;
        let cancelled = false;
        const anim = el?.animate(variant.exit(modeDirection(mode)), {
            duration: ms,
            easing: EASE,
            fill: "forwards",
        });
        (anim ? settle(anim, ms) : Promise.resolve()).then(() => {
            if (!cancelled) setShown(mode);
        });
        return () => {
            cancelled = true;
            anim?.cancel();
        };
    }, [mode, shown, variant]);

    useLayoutEffect(() => {
        if (!mounted.current) {
            mounted.current = true;
            return;
        }
        const el = ref.current;
        if (!el) return;
        el.getAnimations().forEach((a) => a.cancel());
        if (prefersReducedMotion()) return;

        el.animate(variant.enter(modeDirection(shown)), {
            duration: variant.enterMs,
            delay: variant.enterDelay ?? 0,
            easing: EASE,
            fill: "backwards",
        });

        if (variant.stagger) {
            el.querySelectorAll<HTMLElement>(variant.stagger).forEach((child, i) => {
                child.animate(
                    [
                        { opacity: 0, transform: "translateX(-14px)" },
                        { opacity: 1, transform: "translateX(0)" },
                    ],
                    { duration: 350, delay: 140 + i * 70, easing: EASE, fill: "backwards" },
                );
            });
        }
    }, [shown, variant]);

    return [shown, ref] as const;
}

const HEIGHT_EASE = "cubic-bezier(0.65, 0, 0.35, 1)";

/**
 * Pins `boxRef` to the height of `contentRef` and eases every change: the
 * login/register swap, validation messages appearing, responsive reflow, etc.
 * Interrupted tweens continue from the current on-screen height.
 */
export function useAutoHeight(
    boxRef: RefObject<HTMLElement | null>,
    contentRef: RefObject<HTMLElement | null>,
) {
    useLayoutEffect(() => {
        const box = boxRef.current;
        const content = contentRef.current;
        if (!box || !content) return;
        let last = content.offsetHeight;

        const observer = new ResizeObserver(() => {
            const next = content.offsetHeight;
            if (next === last) return;
            last = next;

            const style = getComputedStyle(box);
            const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
            const from = box.getBoundingClientRect().height;
            const to = next + padding;

            box.getAnimations().forEach((a) => a.cancel());
            box.style.height = `${to}px`;

            const distance = Math.abs(to - from);
            if (distance < 2 || prefersReducedMotion()) return;
            box.animate([{ height: `${from}px` }, { height: `${to}px` }], {
                duration: Math.min(620, Math.max(320, distance * 2.2)),
                easing: HEIGHT_EASE,
            });
        });

        observer.observe(content);
        return () => observer.disconnect();
    }, [boxRef, contentRef]);
}

/** Tweens an element's transform whenever the target value changes. */
export function useTransformTween(
    ref: RefObject<HTMLElement | null>,
    transform: string,
    ms: number,
) {
    const prev = useRef(transform);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el || prev.current === transform) return;
        const running = el.getAnimations();
        const from = running.length > 0 ? getComputedStyle(el).transform : prev.current;
        prev.current = transform;
        running.forEach((a) => a.cancel());
        if (prefersReducedMotion()) return;
        el.animate([{ transform: from }, { transform }], { duration: ms, easing: EASE });
    }, [ref, transform, ms]);
}
