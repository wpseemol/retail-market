"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/money";

interface LatestItem {
    id: number;
    name: string;
    price: number;
    originalPrice: number;
    image: string;
    alt: string;
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const PAGE_DWELL_MS = 5000;

function prefersReducedMotion() {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const latestProductsPage1: LatestItem[] = [
    {
        id: 1,
        name: "Canon EOS 4000D 18M DSLR Camera",
        price: 48000,
        originalPrice: 54000,
        image: "/images/Leatest Item (1).png",
        alt: "Canon EOS 4000D DSLR Camera",
    },
    {
        id: 2,
        name: "Table Fan 12-Inch Oscillating Table Fan",
        price: 3480,
        originalPrice: 5400,
        image: "/images/Leatest Item (2).png",
        alt: "Oscillating Table Fan",
    },
    {
        id: 3,
        name: "Samsung Galaxy A13 LTE Cell Phone",
        price: 21240,
        originalPrice: 22200,
        image: "/images/Leatest Item (3).png",
        alt: "Samsung Galaxy A13 LTE Cell Phone",
    },
    {
        id: 4,
        name: "Sceptre Curved 24 inch Gaming Monitor",
        price: 10080,
        originalPrice: 11400,
        image: "/images/Leatest Item (4).png",
        alt: "Sceptre Curved Gaming Monitor",
    },
    {
        id: 5,
        name: "Sony WH-CH720N Wireless Headphones",
        price: 3240,
        originalPrice: 4680,
        image: "/images/Leatest Item (5).png",
        alt: "Sony WH-CH720N Wireless Headphones",
    },
    {
        id: 6,
        name: "Canon G3270 Wireless Inkjet Printer",
        price: 17640,
        originalPrice: 21000,
        image: "/images/Leatest Item (6).png",
        alt: "Canon G3270 Wireless Inkjet Printer",
    },
];

const latestProductsPage2: LatestItem[] = [
    {
        id: 7,
        name: "Canon G3270 Wireless Inkjet Printer",
        price: 17640,
        originalPrice: 21000,
        image: "/images/Leatest Item (6).png",
        alt: "Canon G3270 Wireless Inkjet Printer",
    },
    {
        id: 8,
        name: "Sony WH-CH720N Wireless Headphones",
        price: 3240,
        originalPrice: 4680,
        image: "/images/Leatest Item (5).png",
        alt: "Sony Wireless Headphones",
    },
    {
        id: 9,
        name: "Sceptre Curved 24 inch Gaming Monitor",
        price: 10080,
        originalPrice: 11400,
        image: "/images/Leatest Item (4).png",
        alt: "Curved Gaming Monitor",
    },
    {
        id: 10,
        name: "Samsung Galaxy A13 LTE Cell Phone",
        price: 21240,
        originalPrice: 22200,
        image: "/images/Leatest Item (3).png",
        alt: "Samsung Galaxy Cell Phone",
    },
    {
        id: 11,
        name: "Table Fan 12-Inch Oscillating Table Fan",
        price: 3480,
        originalPrice: 5400,
        image: "/images/Leatest Item (2).png",
        alt: "Oscillating Table Fan",
    },
    {
        id: 12,
        name: "Canon EOS 4000D 18M DSLR Camera",
        price: 48000,
        originalPrice: 54000,
        image: "/images/Leatest Item (1).png",
        alt: "Canon DSLR Camera",
    },
];

const pages = [latestProductsPage1, latestProductsPage2] as const;

export default function LatestItemsSidebar() {
    const [page, setPage] = useState(0);
    const [dir, setDir] = useState<1 | -1>(1);
    const [paused, setPaused] = useState(false);
    const listRef = useRef<HTMLUListElement>(null);
    const skipFirstAnim = useRef(true);

    const items = pages[page];
    const canPrev = page > 0;
    const canNext = page < pages.length - 1;

    const goPrev = () => {
        if (!canPrev) return;
        setDir(-1);
        setPage((p) => p - 1);
    };

    const goNext = () => {
        if (!canNext) return;
        setDir(1);
        setPage((p) => p + 1);
    };

    // Auto-loop pages (pause on hover / reduced motion).
    useEffect(() => {
        if (paused || prefersReducedMotion()) return;
        const id = window.setInterval(() => {
            setDir(1);
            setPage((p) => (p + 1) % pages.length);
        }, PAGE_DWELL_MS);
        return () => window.clearInterval(id);
    }, [paused, page]);

    useLayoutEffect(() => {
        const list = listRef.current;
        if (!list) return;
        if (skipFirstAnim.current) {
            skipFirstAnim.current = false;
            return;
        }
        list.getAnimations().forEach((a) => a.cancel());
        if (prefersReducedMotion()) return;

        list.animate(
            [
                {
                    opacity: 0,
                    transform: `translate3d(0, ${dir > 0 ? 12 : -12}px, 0)`,
                },
                { opacity: 1, transform: "translate3d(0, 0, 0)" },
            ],
            { duration: 360, easing: EASE, fill: "both" },
        );

        list.querySelectorAll<HTMLElement>("[data-li-row]").forEach((row, i) => {
            row.getAnimations().forEach((a) => a.cancel());
            row.animate(
                [
                    {
                        opacity: 0,
                        transform: `translate3d(${dir > 0 ? 14 : -14}px, 0, 0)`,
                    },
                    { opacity: 1, transform: "translate3d(0, 0, 0)" },
                ],
                {
                    duration: 340,
                    delay: 30 + i * 40,
                    easing: EASE,
                    fill: "both",
                },
            );
        });
    }, [page, dir]);

    const arrowBtn =
        "p-1 rounded text-text-secondary hover:text-brand-primary transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100";

    return (
        <aside
            aria-label="Latest Products"
            className="w-full h-full bg-bg-surface border border-border-default rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-xs transition-colors duration-200 overflow-hidden"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setPaused(false);
                }
            }}
        >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-default/60">
                <div className="relative">
                    <h2 className="text-text-primary text-4.25 sm:text-4.75 font-bold tracking-tight pb-2">
                        Latest Item
                    </h2>
                    <span className="absolute bottom-0 left-0 w-6 h-0.5 bg-brand-primary" />
                </div>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={goPrev}
                        aria-label="Previous items"
                        disabled={!canPrev}
                        className={arrowBtn}
                    >
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={goNext}
                        aria-label="Next items"
                        disabled={!canNext}
                        className={arrowBtn}
                    >
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </button>
                </div>
            </div>

            <ul
                ref={listRef}
                className="flex flex-col justify-between flex-1 list-none m-0 p-0 py-1 gap-2 will-change-transform"
            >
                {items.map((item) => (
                    <li key={item.id} data-li-row>
                        <Link
                            href="/shop"
                            className="group flex items-center gap-3.5 transition-transform duration-200 hover:translate-x-0.5"
                        >
                            <div className="relative w-14 h-14 sm:w-15 sm:h-15 shrink-0 rounded-lg bg-bg-subtle border border-border-default/50 p-1 flex items-center justify-center overflow-hidden">
                                <Image
                                    src={item.image}
                                    alt={item.alt}
                                    fill
                                    sizes="64px"
                                    className="object-contain p-1 transition-transform duration-300 group-hover:scale-105"
                                />
                            </div>

                            <div className="flex flex-col">
                                <h3 className="text-text-primary text-[13px] font-medium leading-snug line-clamp-2 group-hover:text-brand-primary transition-colors">
                                    {item.name}
                                </h3>
                                <div className="flex items-center gap-1.5 mt-0.5 text-[13px]">
                                    <span className="text-brand-primary font-bold">
                                        {formatPrice(item.price)}
                                    </span>
                                    <span className="text-text-secondary line-through font-normal text-xs">
                                        {formatPrice(item.originalPrice)}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </aside>
    );
}
