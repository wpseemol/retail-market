"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "@/lib/money";

interface CenterProductItem {
    id: number;
    brand: string;
    title: string;
    subtitle: string;
    price: number;
    originalPrice: number;
    discountPercent: number;
    rating: number;
    mainImage: string;
    thumbImage: string;
    alt: string;
    link: string;
}

const centerProducts: CenterProductItem[] = [
    {
        id: 1,
        brand: "Microsoft Surface",
        title: "Surface Pro 9",
        subtitle: "Laptop Power, Tablet Flexibility",
        price: 19200,
        originalPrice: 24000,
        discountPercent: 20,
        rating: 3,
        mainImage: "/images/Deals of The Day img_82 3.png",
        thumbImage: "/images/Deals of The Day product center 1.png",
        alt: "Surface Pro 9 Convertible Laptop",
        link: "/shop/product/surface-pro-9",
    },
    {
        id: 2,
        brand: "Logitech Vision",
        title: "StreamCam HD Pro",
        subtitle: "Ultra 1080p 60FPS Video Streaming",
        price: 11880,
        originalPrice: 15480,
        discountPercent: 23,
        rating: 4,
        mainImage: "/images/Deals of The Day product center 2.png",
        thumbImage: "/images/Deals of The Day product center 2.png",
        alt: "Logitech StreamCam 1080p",
        link: "/shop/product/streamcam-pro",
    },
    {
        id: 3,
        brand: "Razer Gaming",
        title: "Basilisk V3 Pro",
        subtitle: "Customizable Ergonomic Gaming Mouse",
        price: 8280,
        originalPrice: 10680,
        discountPercent: 22,
        rating: 5,
        mainImage: "/images/Deals of The Day product center 3.png",
        thumbImage: "/images/Deals of The Day product center 3.png",
        alt: "Razer Basilisk Gaming Mouse",
        link: "/shop/product/basilisk-v3",
    },
    {
        id: 4,
        brand: "Lenovo IdeaPad",
        title: "IdeaPad Flex 5",
        subtitle: "2-in-1 Touchscreen Laptop Mode",
        price: 59880,
        originalPrice: 71880,
        discountPercent: 17,
        rating: 4,
        mainImage: "/images/Deals of The Day product center 4.png",
        thumbImage: "/images/Deals of The Day product center 4.png",
        alt: "Lenovo Flex 2-in-1 Laptop",
        link: "/shop/product/ideapad-flex-5",
    },
];

export default function DealsCenterProduct() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [timeLeft, setTimeLeft] = useState({
        days: 11,
        hours: 13,
        mins: 45,
        secs: 0,
    });

    useEffect(() => {
        if (isPaused) return;

        const autoSlide = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % centerProducts.length);
        }, 4500);

        return () => clearInterval(autoSlide);
    }, [isPaused]);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev.secs > 0) return { ...prev, secs: prev.secs - 1 };
                if (prev.mins > 0) return { ...prev, mins: 59, secs: 59 };
                if (prev.hours > 0)
                    return {
                        ...prev,
                        hours: prev.hours - 1,
                        mins: 59,
                        secs: 59,
                    };
                if (prev.days > 0)
                    return {
                        ...prev,
                        days: prev.days - 1,
                        hours: 23,
                        mins: 59,
                        secs: 59,
                    };
                return prev;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const activeProduct = centerProducts[currentIndex];
    const formatUnit = (num: number) => String(num).padStart(2, "0");

    return (
        <article
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="w-full h-full rounded-xl bg-bg-surface border border-border-default p-5 sm:p-6 flex flex-col justify-between shadow-xs transition-colors duration-200"
        >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center min-h-67.5">
                {/* Animated Details Column */}
                <div className="md:col-span-6 flex flex-col items-start">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeProduct.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                            className="w-full flex flex-col items-start"
                        >
                            {/* Star Rating */}
                            <div
                                className="flex items-center gap-1 mb-2.5"
                                aria-label={`${activeProduct.rating} out of 5 stars`}
                            >
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <svg
                                        key={star}
                                        width="13"
                                        height="13"
                                        viewBox="0 0 20 20"
                                        fill={
                                            star <= activeProduct.rating
                                                ? "#F59E0B"
                                                : "none"
                                        }
                                        stroke="#F59E0B"
                                        strokeWidth="1.5"
                                        aria-hidden="true"
                                    >
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>

                            {/* Brand Logo / Tag */}
                            <div className="flex items-center gap-2 mb-2">
                                <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5">
                                    <span className="bg-[#F25022] rounded-[1px]" />
                                    <span className="bg-[#7FBA00] rounded-[1px]" />
                                    <span className="bg-[#00A4EF] rounded-[1px]" />
                                    <span className="bg-[#FFB900] rounded-[1px]" />
                                </div>
                                <span className="text-text-secondary text-xs font-semibold">
                                    {activeProduct.brand}
                                </span>
                            </div>

                            <h3 className="text-text-primary text-xl sm:text-2xl font-bold tracking-tight mb-1">
                                <Link
                                    href={activeProduct.link}
                                    className="hover:text-brand-primary transition-colors"
                                >
                                    {activeProduct.title}
                                </Link>
                            </h3>
                            <p className="text-text-secondary text-[13px] font-normal mb-3">
                                {activeProduct.subtitle}
                            </p>

                            {/* Pricing */}
                            <div className="flex items-center gap-2.5 mb-4">
                                <span className="text-text-primary text-lg font-bold">
                                    {formatPrice(activeProduct.price)}
                                </span>
                                <span className="text-text-secondary line-through text-sm">
                                    {formatPrice(activeProduct.originalPrice)}
                                </span>
                                <span className="bg-brand-primary text-white text-[11px] font-bold px-1.5 py-0.5 rounded-sm">
                                    -{activeProduct.discountPercent}%
                                </span>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Countdown Clock */}
                    <span className="text-text-primary text-xs font-bold uppercase tracking-wider mb-2.5 block">
                        Deals End To:
                    </span>
                    <div className="flex items-center gap-2 sm:gap-3">
                        {[
                            { label: "Days", value: formatUnit(timeLeft.days) },
                            {
                                label: "Hours",
                                value: formatUnit(timeLeft.hours),
                            },
                            { label: "Mins", value: formatUnit(timeLeft.mins) },
                            { label: "Sec", value: formatUnit(timeLeft.secs) },
                        ].map((unit, idx) => (
                            <div
                                key={idx}
                                className="flex flex-col items-center"
                            >
                                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-border-default/80 flex items-center justify-center bg-bg-base text-text-primary font-bold text-sm shadow-2xs">
                                    {unit.value}
                                </div>
                                <span className="text-[11px] text-text-secondary mt-1 font-medium">
                                    {unit.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Animated Main Image Column */}
                <div className="md:col-span-6 relative w-full h-57.5 sm:h-65 flex items-center justify-center overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeProduct.id}
                            initial={{ opacity: 0, scale: 0.94 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.04 }}
                            transition={{ duration: 0.3 }}
                            className="relative w-full h-full flex items-center justify-center"
                        >
                            <Image
                                src={activeProduct.mainImage}
                                alt={activeProduct.alt}
                                fill
                                sizes="(max-width: 768px) 100vw, 340px"
                                className="object-contain"
                                priority
                            />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Interactive Thumbnails */}
            <div className="grid grid-cols-4 gap-3 pt-5 mt-4 border-t border-border-default/60">
                {centerProducts.map((prod, idx) => {
                    const isSelected = currentIndex === idx;
                    return (
                        <button
                            key={prod.id}
                            type="button"
                            onClick={() => setCurrentIndex(idx)}
                            className={`relative w-full h-16.25 sm:h-18.75 rounded-lg border p-1.5 flex items-center justify-center bg-bg-subtle transition-all cursor-pointer ${
                                isSelected
                                    ? "border-brand-primary ring-2 ring-brand-primary/30 shadow-xs"
                                    : "border-border-default/60 hover:border-text-secondary opacity-70 hover:opacity-100"
                            }`}
                        >
                            <Image
                                src={prod.thumbImage}
                                alt={prod.alt}
                                fill
                                sizes="80px"
                                className="object-contain p-1"
                            />
                        </button>
                    );
                })}
            </div>
        </article>
    );
}
