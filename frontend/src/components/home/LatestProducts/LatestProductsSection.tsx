"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import LatestItemsSidebar from "./LatestItemsSidebar";
import BottomBanners from "./BottomBanners";

interface ProductItem {
    id: number;
    name: string;
    image: string;
    alt: string;
    rating: number;
    currentPrice: number;
    originalPrice: number;
    isNew?: boolean;
}

const tabOptions = [
    "Recent",
    "Best Seller",
    "Top",
    "New Arrivals",
    "Top Rating",
] as const;
type TabOption = (typeof tabOptions)[number];

const showcaseProducts: Record<TabOption, ProductItem[]> = {
    "New Arrivals": [
        {
            id: 101,
            name: 'SAMSUNG Galaxy A7 Lite 8.7" 32GB Android',
            image: "/images/Best Seller Product anather (1).png",
            alt: "Desktop Display Monitor",
            rating: 4,
            currentPrice: 399,
            originalPrice: 450,
            isNew: true,
        },
        {
            id: 102,
            name: "HP DeskJet 4255e Wireless Printer",
            image: "/images/Best Seller Product anather (2).png",
            alt: "Gaming Laptop Computer",
            rating: 4,
            currentPrice: 409,
            originalPrice: 430,
            isNew: true,
        },
        {
            id: 103,
            name: "Optoma UHZ35ST Projector",
            image: "/images/Best Seller Product anather (3).png",
            alt: "Front Load Washing Machine",
            rating: 4,
            currentPrice: 199,
            originalPrice: 250,
            isNew: true,
        },
        {
            id: 104,
            name: "Canon EOS Rebel T7 DSLR Camera",
            image: "/images/Best Seller Product anather (4).png",
            alt: "Red Wireless Headphones",
            rating: 4,
            currentPrice: 379,
            originalPrice: 400,
            isNew: true,
        },
    ],
    Recent: [
        {
            id: 105,
            name: "Canon EOS Rebel T7 DSLR Camera",
            image: "/images/Best Seller Product anather (4).png",
            alt: "Red Wireless Headphones",
            rating: 4,
            currentPrice: 379,
            originalPrice: 400,
            isNew: true,
        },
        {
            id: 106,
            name: 'SAMSUNG Galaxy A7 Lite 8.7" 32GB Android',
            image: "/images/Best Seller Product anather (1).png",
            alt: "Desktop Display Monitor",
            rating: 4,
            currentPrice: 399,
            originalPrice: 450,
            isNew: true,
        },
        {
            id: 107,
            name: "Optoma UHZ35ST Projector",
            image: "/images/Best Seller Product anather (3).png",
            alt: "Front Load Washing Machine",
            rating: 4,
            currentPrice: 199,
            originalPrice: 250,
            isNew: true,
        },
        {
            id: 108,
            name: "HP DeskJet 4255e Wireless Printer",
            image: "/images/Best Seller Product anather (2).png",
            alt: "Gaming Laptop Computer",
            rating: 4,
            currentPrice: 409,
            originalPrice: 430,
            isNew: true,
        },
    ],
    "Best Seller": [
        {
            id: 109,
            name: "HP DeskJet 4255e Wireless Printer",
            image: "/images/Best Seller Product anather (2).png",
            alt: "Gaming Laptop Computer",
            rating: 4,
            currentPrice: 409,
            originalPrice: 430,
            isNew: true,
        },
        {
            id: 110,
            name: "Optoma UHZ35ST Projector",
            image: "/images/Best Seller Product anather (3).png",
            alt: "Front Load Washing Machine",
            rating: 4,
            currentPrice: 199,
            originalPrice: 250,
            isNew: true,
        },
        {
            id: 111,
            name: 'SAMSUNG Galaxy A7 Lite 8.7" 32GB Android',
            image: "/images/Best Seller Product anather (1).png",
            alt: "Desktop Display Monitor",
            rating: 4,
            currentPrice: 399,
            originalPrice: 450,
            isNew: true,
        },
        {
            id: 112,
            name: "Canon EOS Rebel T7 DSLR Camera",
            image: "/images/Best Seller Product anather (4).png",
            alt: "Red Wireless Headphones",
            rating: 4,
            currentPrice: 379,
            originalPrice: 400,
            isNew: true,
        },
    ],
    Top: [
        {
            id: 113,
            name: "Optoma UHZ35ST Projector",
            image: "/images/Best Seller Product anather (3).png",
            alt: "Front Load Washing Machine",
            rating: 4,
            currentPrice: 199,
            originalPrice: 250,
            isNew: true,
        },
        {
            id: 114,
            name: "Canon EOS Rebel T7 DSLR Camera",
            image: "/images/Best Seller Product anather (4).png",
            alt: "Red Wireless Headphones",
            rating: 4,
            currentPrice: 379,
            originalPrice: 400,
            isNew: true,
        },
        {
            id: 115,
            name: 'SAMSUNG Galaxy A7 Lite 8.7" 32GB Android',
            image: "/images/Best Seller Product anather (1).png",
            alt: "Desktop Display Monitor",
            rating: 4,
            currentPrice: 399,
            originalPrice: 450,
            isNew: true,
        },
        {
            id: 116,
            name: "HP DeskJet 4255e Wireless Printer",
            image: "/images/Best Seller Product anather (2).png",
            alt: "Gaming Laptop Computer",
            rating: 4,
            currentPrice: 409,
            originalPrice: 430,
            isNew: true,
        },
    ],
    "Top Rating": [
        {
            id: 117,
            name: 'SAMSUNG Galaxy A7 Lite 8.7" 32GB Android',
            image: "/images/Best Seller Product anather (1).png",
            alt: "Desktop Display Monitor",
            rating: 5,
            currentPrice: 399,
            originalPrice: 450,
            isNew: true,
        },
        {
            id: 118,
            name: "HP DeskJet 4255e Wireless Printer",
            image: "/images/Best Seller Product anather (2).png",
            alt: "Gaming Laptop Computer",
            rating: 5,
            currentPrice: 409,
            originalPrice: 430,
            isNew: true,
        },
        {
            id: 119,
            name: "Optoma UHZ35ST Projector",
            image: "/images/Best Seller Product anather (3).png",
            alt: "Front Load Washing Machine",
            rating: 5,
            currentPrice: 199,
            originalPrice: 250,
            isNew: true,
        },
        {
            id: 120,
            name: "Canon EOS Rebel T7 DSLR Camera",
            image: "/images/Best Seller Product anather (4).png",
            alt: "Red Wireless Headphones",
            rating: 5,
            currentPrice: 379,
            originalPrice: 400,
            isNew: true,
        },
    ],
};

function StarRating({ rating }: { rating: number }) {
    return (
        <div
            className="flex items-center gap-1 my-1.5"
            aria-label={`Rating: ${rating} out of 5 stars`}
        >
            {[1, 2, 3, 4, 5].map((star) => (
                <svg
                    key={star}
                    width="13"
                    height="13"
                    viewBox="0 0 20 20"
                    fill={star <= rating ? "#F59E0B" : "none"}
                    stroke="#F59E0B"
                    strokeWidth="1.5"
                    aria-hidden="true"
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </div>
    );
}

export default function LatestProductsSection() {
    const [activeTab, setActiveTab] = useState<TabOption>("New Arrivals");

    return (
        <section
            aria-label="Latest Products and Best Sellers Showcase"
            className="w-full py-8 bg-bg-base transition-colors duration-200"
        >
            <div className="container mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    {/* ================= Left: Latest Items Vertical List (Sidebar) ================= */}
                    <div className="lg:col-span-3 w-full h-full flex flex-col">
                        <LatestItemsSidebar />
                    </div>

                    {/* ================= Right: Tab Showcase + Dual Banners ================= */}
                    <div className="lg:col-span-9 w-full flex flex-col justify-between">
                        {/* Tab Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 mb-4 border-b border-border-default/60">
                            <div className="relative">
                                <h2 className="text-text-primary text-xl sm:text-2xl font-bold tracking-tight pb-2">
                                    Best Seller Product
                                </h2>
                                <span className="absolute bottom-0 left-0 w-28 h-[2px] bg-brand-primary" />
                            </div>

                            <nav
                                aria-label="Category showcase filter tabs"
                                className="flex items-center gap-4 sm:gap-6 overflow-x-auto pb-1 sm:pb-0 scrollbar-none"
                            >
                                {tabOptions.map((tab) => {
                                    const isActive = activeTab === tab;
                                    return (
                                        <button
                                            key={tab}
                                            type="button"
                                            onClick={() => setActiveTab(tab)}
                                            className={`text-xs sm:text-[14px] font-medium transition-colors relative pb-2 whitespace-nowrap cursor-pointer ${
                                                isActive
                                                    ? "text-brand-primary font-semibold"
                                                    : "text-text-secondary hover:text-text-primary"
                                            }`}
                                        >
                                            {tab}
                                            {isActive && (
                                                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-primary" />
                                            )}
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Product Card Row with Border Dividers */}
                        <div className="relative w-full rounded-xl border border-border-default bg-bg-surface p-4 sm:p-6 shadow-xs">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.2 }}
                                    className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border-default/50"
                                >
                                    {showcaseProducts[activeTab].map(
                                        (product) => (
                                            <article
                                                key={product.id}
                                                className="group relative flex flex-col justify-between items-center text-center px-4 py-4 sm:py-0 transition-colors"
                                            >
                                                {/* Parallelogram 'NEW' Ribbon Badge */}
                                                {product.isNew && (
                                                    <div className="self-start -skew-x-12 bg-brand-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-xs tracking-wider mb-2">
                                                        <span className="skew-x-12 inline-block">
                                                            NEW
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Product Thumbnail */}
                                                <div className="relative w-full h-[140px] sm:h-[160px] flex items-center justify-center">
                                                    <Image
                                                        src={product.image}
                                                        alt={product.alt}
                                                        fill
                                                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                                                        className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                                                    />
                                                </div>

                                                {/* Metadata */}
                                                <div className="w-full flex flex-col items-center mt-3">
                                                    <StarRating
                                                        rating={product.rating}
                                                    />

                                                    <h3 className="text-text-primary text-[13px] sm:text-[14px] font-medium leading-snug line-clamp-2 h-[38px] my-1 group-hover:text-brand-primary transition-colors">
                                                        <Link
                                                            href={`/shop/product/${product.id}`}
                                                        >
                                                            {product.name}
                                                        </Link>
                                                    </h3>

                                                    <div className="flex items-center gap-1.5 text-xs sm:text-[13px] font-semibold mt-1">
                                                        <span className="text-brand-primary">
                                                            ($
                                                            {
                                                                product.currentPrice
                                                            }
                                                        </span>
                                                        <span className="text-text-secondary font-normal">
                                                            -
                                                        </span>
                                                        <span className="text-text-secondary line-through font-normal">
                                                            $
                                                            {
                                                                product.originalPrice
                                                            }
                                                            )
                                                        </span>
                                                    </div>
                                                </div>
                                            </article>
                                        ),
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Dual Promotional Banners underneath */}
                        <BottomBanners />
                    </div>
                </div>
            </div>
        </section>
    );
}
