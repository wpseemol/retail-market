"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, Variants } from "framer-motion";

interface PromoSlide {
    id: number;
    price: string;
    tagline: string;
    highlightText: string;
    subHighlight: string;
    categoryTag: string;
    titleLine1: string;
    titleLine2: string;
    buttonText: string;
    buttonLink: string;
    image: string;
    imageAlt: string;
}

const promoSlides: PromoSlide[] = [
    {
        id: 1,
        price: "$106.00",
        tagline: "ALL-NEW-SPORT",
        highlightText: "5K",
        subHighlight: "STARTING AT",
        categoryTag: "OS Tablet",
        titleLine1: "Acer Chromebook Tab",
        titleLine2: "10 Is Official",
        buttonText: "SHOP NOW",
        buttonLink: "/shop?product=acer-chromebook-tab-10",
        image: "/images/PromoBannerSlider_Product_1.png",
        imageAlt: "Acer Chromebook Tab 10",
    },
    {
        id: 2,
        price: "$299.99",
        tagline: "PRO WORKSPACE",
        highlightText: "4K",
        subHighlight: "STARTING AT",
        categoryTag: "IPS Monitor",
        titleLine1: "Curved UltraWide",
        titleLine2: "Display Edition",
        buttonText: "EXPLORE DEALS",
        buttonLink: "/shop?product=curved-display-edition",
        image: "/images/PromoBannerSlider_Product_1.png",
        imageAlt: "Curved UltraWide Monitor",
    },
    {
        id: 3,
        price: "$450.00",
        tagline: "ULTRA POWER",
        highlightText: "12th",
        subHighlight: "GEN INTEL",
        categoryTag: "Touch Laptop",
        titleLine1: "Convertible Yoga",
        titleLine2: "Slim Pro Series",
        buttonText: "VIEW PRODUCT",
        buttonLink: "/shop?product=yoga-slim-pro",
        image: "/images/PromoBannerSlider_Product_1.png",
        imageAlt: "Convertible Touch Laptop",
    },
];

export default function PromoBannerSlider() {
    const [current, setCurrent] = useState(0);
    const [direction, setDirection] = useState<"up" | "down">("up");
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (isPaused) return;
        const interval = setInterval(() => {
            setDirection("up");
            setCurrent((prev) => (prev + 1) % promoSlides.length);
        }, 4500);

        return () => clearInterval(interval);
    }, [isPaused]);

    const goToSlide = (index: number) => {
        setDirection(index > current ? "up" : "down");
        setCurrent(index);
    };

    const slideVariants: Variants = {
        initial: (dir: "up" | "down") => ({
            y: dir === "up" ? 80 : -80,
            opacity: 0,
        }),
        animate: {
            y: 0,
            opacity: 1,
            transition: {
                y: { type: "spring", stiffness: 220, damping: 24 },
                opacity: { duration: 0.35 },
            },
        },
        exit: (dir: "up" | "down") => ({
            y: dir === "up" ? -80 : 80,
            opacity: 0,
            transition: {
                duration: 0.3,
                ease: "easeInOut",
            },
        }),
    };

    return (
        <section
            aria-label="Promotional Showcase Banner"
            className="w-full py-6 bg-bg-base transition-colors duration-200"
        >
            <div className="container mx-auto">
                <div
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                    className="relative flex w-full min-h-77.5 items-center justify-between overflow-hidden rounded-2xl border border-border-default bg-bg-surface bg-[url('/images/PromoBannerSlider_bg.png')] bg-cover bg-center p-6 shadow-xs sm:p-10 md:min-h-85 lg:p-12 dark:bg-none dark:bg-blend-luminosity"
                >
                    {/* Animated Slide Content */}
                    <AnimatePresence mode="wait" custom={direction} initial={false}>
                        <motion.div
                            key={promoSlides[current].id}
                            custom={direction}
                            variants={slideVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="relative z-10 w-full flex flex-col-reverse md:flex-row items-center justify-between gap-6"
                        >
                            {/* Product Visual */}
                            <div className="relative w-60 h-47.5 sm:w-80 sm:h-60 lg:w-95 lg:h-67.5 shrink-0 flex items-center justify-center">
                                <Image
                                    src={promoSlides[current].image}
                                    alt={promoSlides[current].imageAlt}
                                    fill
                                    sizes="(max-width: 768px) 240px, 380px"
                                    className="object-contain drop-shadow-xl"
                                    priority
                                />
                            </div>

                            {/* Slide Details */}
                            <div className="flex flex-col items-start max-w-lg md:pl-6 w-full">
                                {/* Price & Highlight Row */}
                                <div className="flex items-center gap-6 sm:gap-10 mb-4">
                                    <div>
                                        <span className="text-[20px] sm:text-[24px] font-bold text-brand-primary leading-none block">
                                            {promoSlides[current].price}
                                        </span>
                                        <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-text-secondary uppercase">
                                            {promoSlides[current].tagline}
                                        </span>
                                    </div>

                                    <div className="flex items-baseline">
                                        <span className="text-[34px] sm:text-[44px] font-black text-brand-primary leading-none mr-2">
                                            {promoSlides[current].highlightText}
                                        </span>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] sm:text-[10px] font-bold tracking-tight text-text-primary uppercase leading-tight">
                                                {
                                                    promoSlides[current]
                                                        .subHighlight
                                                }
                                            </span>
                                            <span className="text-[13px] sm:text-[15px] font-bold text-text-primary leading-tight">
                                                {
                                                    promoSlides[current]
                                                        .categoryTag
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Headline */}
                                <h2 className="text-text-primary text-2xl sm:text-3xl lg:text-[34px] font-bold leading-[1.2] tracking-tight mb-5">
                                    <span>
                                        {promoSlides[current].titleLine1}
                                    </span>
                                    <br />
                                    <span>
                                        {promoSlides[current].titleLine2}
                                    </span>
                                </h2>

                                {/* Action Button */}
                                <Link
                                    href={promoSlides[current].buttonLink}
                                    className="inline-flex items-center gap-2.5 bg-black dark:bg-white text-white dark:text-black hover:bg-brand-primary dark:hover:bg-brand-primary dark:hover:text-white text-xs sm:text-[13px] font-bold tracking-wider uppercase px-7 py-3 rounded-full transition-all duration-200 group shadow-sm"
                                >
                                    <span>
                                        {promoSlides[current].buttonText}
                                    </span>
                                    <span
                                        aria-hidden="true"
                                        className="transition-transform group-hover:translate-x-1"
                                    >
                                        &rarr;
                                    </span>
                                </Link>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Vertical Slide Indicators */}
                    <div
                        className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20"
                        role="tablist"
                        aria-label="Slide Selector"
                    >
                        {promoSlides.map((slide, idx) => (
                            <button
                                key={slide.id}
                                type="button"
                                onClick={() => goToSlide(idx)}
                                aria-label={`Go to slide ${idx + 1}`}
                                className={`w-2.5 transition-all duration-300 rounded-full cursor-pointer ${
                                    current === idx
                                        ? "h-6 bg-brand-primary"
                                        : "h-2.5 bg-border-default hover:bg-text-secondary"
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
