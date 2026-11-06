"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/providers/LocaleProvider";

const SHOW_AFTER_PX = 420;

/** Fixed bottom-right control — shown after scrolling, every route. */
export default function ScrollToTopButton() {
    const { t } = useI18n();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const onScroll = () => {
            setVisible(window.scrollY > SHOW_AFTER_PX);
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <button
            type="button"
            aria-label={t.header.backToTop}
            aria-hidden={!visible}
            tabIndex={visible ? 0 : -1}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className={`fixed bottom-6 right-5 z-40 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-brand-primary text-white shadow-lg transition-[opacity,transform,background-color] duration-300 hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${
                visible
                    ? "pointer-events-auto translate-y-0 opacity-100"
                    : "pointer-events-none translate-y-3 opacity-0"
            }`}
        >
            <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
        </button>
    );
}
