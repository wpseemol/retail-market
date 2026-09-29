"use client";

import { useEffect } from "react";
import Lenis from "lenis";

export default function SmoothScroll() {
    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
        }

        // Nested scrollables opt out with `data-lenis-prevent`; `allowNestedScroll`
        // walks the DOM + computed styles on every wheel event and causes jank.
        const lenis = new Lenis({
            autoRaf: true,
            duration: 1.1,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 1.2,
            anchors: true,
            stopInertiaOnNavigate: true,
        });

        // Modals and the mobile drawer lock scroll via inline `overflow: hidden`.
        const syncScrollLock = () => {
            const locked =
                document.body.style.overflow === "hidden" ||
                document.documentElement.style.overflow === "hidden";
            if (locked) lenis.stop();
            else lenis.start();
        };
        const observer = new MutationObserver(syncScrollLock);
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ["style"],
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["style"],
        });
        syncScrollLock();

        return () => {
            observer.disconnect();
            lenis.destroy();
        };
    }, []);

    return null;
}
