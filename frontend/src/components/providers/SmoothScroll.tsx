"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";

export default function SmoothScroll() {
    useEffect(() => {
        const lenis = new Lenis({
            lerp: 0.1,
            allowNestedScroll: true,
            anchors: true,
            stopInertiaOnNavigate: true,
        });

        const update = (time: number) => lenis.raf(time * 1000);
        gsap.ticker.add(update);
        gsap.ticker.lagSmoothing(0);

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
            gsap.ticker.remove(update);
            lenis.destroy();
        };
    }, []);

    return null;
}
