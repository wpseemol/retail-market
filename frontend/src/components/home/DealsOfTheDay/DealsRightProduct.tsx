"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface RightProductItem {
    id: number;
    name: string;
    price: number;
    originalPrice: number;
    discountPercent: number;
    rating: number;
    available: number;
    soldOut: number;
    mainImage: string;
    thumbImage: string;
    alt: string;
    link: string;
}

const rightProducts: RightProductItem[] = [
    {
        id: 1,
        name: "AltoPlus Amplified Corded Phone with Caller ID",
        price: 147,
        originalPrice: 150,
        discountPercent: 20,
        rating: 3,
        available: 334,
        soldOut: 180,
        mainImage: "/images/Deals of The Day right product images.png",
        thumbImage: "/images/Deals of The Day product 1.png",
        alt: "AltoPlus Amplified Desk Phone",
        link: "/shop/product/altoplus-phone",
    },
    {
        id: 2,
        name: "Corsair RM850x Fully Modular Power Supply",
        price: 139,
        originalPrice: 169,
        discountPercent: 18,
        rating: 4,
        available: 120,
        soldOut: 240,
        mainImage: "/images/Deals of The Day product right 2.png",
        thumbImage: "/images/Deals of The Day product right 2.png",
        alt: "Corsair Desktop Power Supply Unit",
        link: "/shop/product/corsair-psu",
    },
    {
        id: 3,
        name: "Dell Inspiron 15 Core i5 Workstation Laptop",
        price: 520,
        originalPrice: 650,
        discountPercent: 20,
        rating: 4,
        available: 95,
        soldOut: 110,
        mainImage: "/images/Deals of The Day product right 3.png",
        thumbImage: "/images/Deals of The Day product right 3.png",
        alt: "Dell Inspiron Business Laptop",
        link: "/shop/product/dell-laptop",
    },
    {
        id: 4,
        name: "Beats Solo3 Wireless Over-Ear Headphones",
        price: 159,
        originalPrice: 199,
        discountPercent: 20,
        rating: 5,
        available: 210,
        soldOut: 320,
        mainImage: "/images/Deals of The Day product right 4.png",
        thumbImage: "/images/Deals of The Day product right 4.png",
        alt: "Beats Solo3 Red Headphones",
        link: "/shop/product/beats-solo3",
    },
];

export default function DealsRightProduct() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (isPaused) return;

        const autoSlide = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % rightProducts.length);
        }, 4500);

        return () => clearInterval(autoSlide);
    }, [isPaused]);

    const activeProduct = rightProducts[currentIndex];
    const progressPercent = Math.min(
        100,
        Math.round(
            (activeProduct.soldOut /
                (activeProduct.available + activeProduct.soldOut)) *
                100,
        ),
    );

    return (
        <article
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="w-full h-full rounded-xl bg-bg-surface border border-border-default p-5 sm:p-6 flex flex-col justify-between shadow-xs transition-colors duration-200"
        >
            {/* Animated Main Image */}
            <div className="relative w-full h-[200px] sm:h-[220px] flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeProduct.id}
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        transition={{ duration: 0.3 }}
                        className="relative w-full h-full flex items-center justify-center"
                    >
                        <Image
                            src={activeProduct.mainImage}
                            alt={activeProduct.alt}
                            fill
                            sizes="(max-width: 1024px) 100vw, 300px"
                            className="object-contain"
                            priority
                        />
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Interactive Thumbnails */}
            <div className="grid grid-cols-4 gap-2.5 my-3.5">
                {rightProducts.map((item, idx) => {
                    const isSelected = currentIndex === idx;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setCurrentIndex(idx)}
                            className={`relative w-full h-12 sm:h-14 rounded-lg border p-1 flex items-center justify-center bg-bg-subtle transition-all cursor-pointer ${
                                isSelected
                                    ? "border-brand-primary ring-2 ring-brand-primary/30"
                                    : "border-border-default/60 hover:border-text-secondary opacity-70 hover:opacity-100"
                            }`}
                        >
                            <Image
                                src={item.thumbImage}
                                alt={item.alt}
                                fill
                                sizes="60px"
                                className="object-contain p-0.5"
                            />
                        </button>
                    );
                })}
            </div>

            {/* Animated Stock Levels & Progress Bar */}
            <div className="w-full my-2">
                <div className="flex items-center justify-between text-xs sm:text-[13px] font-medium text-text-secondary mb-1.5">
                    <span>
                        Available:{" "}
                        <strong className="text-text-primary font-bold">
                            {activeProduct.available}
                        </strong>
                    </span>
                    <span>
                        Sold Out:{" "}
                        <strong className="text-text-primary font-bold">
                            {activeProduct.soldOut}
                        </strong>
                    </span>
                </div>

                <div className="w-full h-1.5 bg-border-default/50 rounded-full overflow-hidden">
                    <motion.div
                        key={activeProduct.id}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="h-full bg-brand-primary rounded-full"
                    />
                </div>
            </div>

            {/* Animated Product Details */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeProduct.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-start mt-2"
                >
                    {/* Rating */}
                    <div
                        className="flex items-center gap-1 mb-1.5"
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

                    <h3 className="text-text-primary text-[15px] sm:text-[16px] font-bold leading-snug line-clamp-2 mb-2">
                        <Link
                            href={activeProduct.link}
                            className="hover:text-brand-primary transition-colors"
                        >
                            {activeProduct.name}
                        </Link>
                    </h3>

                    {/* Pricing */}
                    <div className="flex items-center gap-2">
                        <span className="text-brand-primary text-base sm:text-lg font-bold">
                            ${activeProduct.price}
                        </span>
                        <span className="text-text-secondary line-through text-xs sm:text-sm">
                            ${activeProduct.originalPrice}
                        </span>
                        <span className="bg-brand-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                            -{activeProduct.discountPercent}%
                        </span>
                    </div>
                </motion.div>
            </AnimatePresence>
        </article>
    );
}
