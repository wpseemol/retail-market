"use client";

import React, { useCallback, useEffect, useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const COUNTDOWN_SECONDS = 15;
const SESSION_KEY = "home-welcome-modal-dismissed";

export default function HomeWelcomeModal() {
    const titleId = useId();
    const [isOpen, setIsOpen] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);

    const closeModal = useCallback(() => {
        setIsOpen(false);
        try {
            sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
            // Ignore storage failures (private mode, etc.)
        }
    }, []);

    // Show on first home load in this browser session
    useEffect(() => {
        try {
            if (sessionStorage.getItem(SESSION_KEY) === "1") return;
        } catch {
            // Continue and show the modal
        }

        const showTimer = window.setTimeout(() => {
            setIsOpen(true);
            setSecondsLeft(COUNTDOWN_SECONDS);
        }, 250);

        return () => window.clearTimeout(showTimer);
    }, []);

    // 15s countdown + auto dismiss
    useEffect(() => {
        if (!isOpen) return;

        const interval = window.setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    window.clearInterval(interval);
                    closeModal();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => window.clearInterval(interval);
    }, [isOpen, closeModal]);

    // Esc to close + lock body scroll
    useEffect(() => {
        if (!isOpen) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") closeModal();
        };

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [isOpen, closeModal]);

    if (!isOpen) return null;

    const progress = secondsLeft / COUNTDOWN_SECONDS;
    const ringSize = 88;
    const stroke = 5;
    const radius = (ringSize - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - progress);

    return (
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
            role="presentation"
        >
            <button
                type="button"
                aria-label="Close welcome offer overlay"
                className="absolute inset-0 border-0 bg-overlay-scrim cursor-pointer"
                onClick={closeModal}
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative z-10 w-full max-w-[720px] overflow-hidden rounded-2xl border border-border-default bg-bg-surface shadow-[0_24px_64px_rgba(0,0,0,0.28)]"
            >
                {/* Close */}
                <button
                    type="button"
                    onClick={closeModal}
                    aria-label="Close welcome offer"
                    className="absolute top-3 right-3 z-30 h-9 w-9 rounded-full border border-border-default bg-bg-subtle text-text-secondary hover:text-text-primary hover:border-brand-primary flex items-center justify-center cursor-pointer transition-colors"
                >
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        aria-hidden="true"
                    >
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Product visual */}
                    <div className="relative min-h-52 sm:min-h-64 md:min-h-80 bg-bg-subtle overflow-hidden">
                        <Image
                            src="/images/hero_bg_06 1.png"
                            alt=""
                            fill
                            className="object-cover opacity-40 dark:opacity-15"
                            aria-hidden="true"
                        />
                        <div className="relative z-10 h-full min-h-52 sm:min-h-64 md:min-h-80 flex items-center justify-center p-6">
                            <div className="relative w-44 h-40 sm:w-52 sm:h-48">
                                <Image
                                    src="/images/camera.png"
                                    alt="Featured DSLR camera offer"
                                    fill
                                    sizes="208px"
                                    className="object-contain drop-shadow-xl"
                                    priority
                                />
                            </div>
                        </div>

                        <span className="absolute top-4 left-4 z-20 bg-brand-primary text-white text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded">
                            Limited Offer
                        </span>
                    </div>

                    {/* Offer + countdown */}
                    <div className="relative flex flex-col items-center md:items-start justify-center gap-4 p-6 sm:p-8 text-center md:text-left">
                        <div
                            className="relative shrink-0"
                            aria-live="polite"
                            aria-atomic="true"
                            aria-label={`${secondsLeft} seconds remaining`}
                        >
                            <svg
                                width={ringSize}
                                height={ringSize}
                                viewBox={`0 0 ${ringSize} ${ringSize}`}
                                className="-rotate-90"
                                aria-hidden="true"
                            >
                                <circle
                                    cx={ringSize / 2}
                                    cy={ringSize / 2}
                                    r={radius}
                                    fill="none"
                                    stroke="var(--border-default)"
                                    strokeWidth={stroke}
                                />
                                <circle
                                    cx={ringSize / 2}
                                    cy={ringSize / 2}
                                    r={radius}
                                    fill="none"
                                    stroke="var(--brand-primary)"
                                    strokeWidth={stroke}
                                    strokeLinecap="round"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={dashOffset}
                                    className="transition-[stroke-dashoffset] duration-1000 linear"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-brand-primary leading-none tabular-nums">
                                    {secondsLeft}
                                </span>
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary mt-0.5">
                                    sec
                                </span>
                            </div>
                        </div>

                        <div>
                            <p className="text-brand-primary text-xs sm:text-sm font-bold uppercase tracking-wider mb-1.5">
                                Don&apos;t Miss Out
                            </p>
                            <h2
                                id={titleId}
                                className="text-text-primary text-xl sm:text-2xl font-extrabold leading-tight tracking-tight mb-2"
                            >
                                Get Up To{" "}
                                <span className="text-brand-primary">70%</span>{" "}
                                Off Digital Cameras
                            </h2>
                            <p className="text-text-secondary text-sm leading-relaxed">
                                Flash deal ends when the timer hits zero. Shop
                                now before this offer disappears.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full mt-1">
                            <Link
                                href="/shop?category=cameras"
                                onClick={closeModal}
                                className="inline-flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-hover text-white text-xs sm:text-[13px] font-bold uppercase tracking-wider px-6 py-3 rounded-full transition-colors"
                            >
                                <span>Shop Now</span>
                                <span aria-hidden="true">&rarr;</span>
                            </Link>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="inline-flex items-center justify-center text-text-secondary hover:text-text-primary text-xs sm:text-sm font-medium px-3 py-2 cursor-pointer transition-colors"
                            >
                                No thanks, close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
