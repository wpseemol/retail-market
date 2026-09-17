"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

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

const tabCategories = [
    "Engine",
    "Transmission",
    "Battery",
    "Radiator",
    "Fuel Tank",
] as const;

type TabCategory = (typeof tabCategories)[number];

const bestSellerProductsByTab: Record<TabCategory, ProductItem[]> = {
    "Fuel Tank": [
        {
            id: 1,
            name: 'SAMSUNG Galaxy A7 Lite 8.7" 32GB Android',
            image: "/images/best_seller_product (1).png",
            alt: "Samsung Galaxy Tab",
            rating: 3,
            currentPrice: 390,
            originalPrice: 440,
            isNew: true,
        },
        {
            id: 2,
            name: "Optoma UHZ35ST Projector",
            image: "/images/best_seller_product (3).png",
            alt: "Optoma UHZ35ST Projector",
            rating: 4,
            currentPrice: 205,
            originalPrice: 255,
            isNew: true,
        },
        {
            id: 3,
            name: "HP DeskJet 4255e Wireless Printer",
            image: "/images/best_seller_product (2).png",
            alt: "HP DeskJet Printer",
            rating: 3,
            currentPrice: 400,
            originalPrice: 425,
            isNew: true,
        },
        {
            id: 4,
            name: "Canon EOS Rebel T7 DSLR Camera",
            image: "/images/best_seller_product (4).png",
            alt: "Canon DSLR Camera",
            rating: 3,
            currentPrice: 375,
            originalPrice: 405,
            isNew: true,
        },
        {
            id: 5,
            name: "Canon EOS Rebel T7 DSLR Camera",
            image: "/images/best_seller_product (4).png",
            alt: "Canon DSLR Camera secondary",
            rating: 3,
            currentPrice: 375,
            originalPrice: 405,
            isNew: true,
        },
        {
            id: 6,
            name: "Canon EOS Rebel T7 DSLR Camera",
            image: "/images/best_seller_product (4).png",
            alt: "Canon DSLR Camera third",
            rating: 3,
            currentPrice: 375,
            originalPrice: 405,
            isNew: true,
        },
    ],
    Radiator: [
        {
            id: 7,
            name: 'SAMSUNG Galaxy A7 Lite 8.7" 32GB Android',
            image: "/images/best_seller_product (1).png",
            alt: "Samsung Galaxy A7 Lite",
            rating: 3,
            currentPrice: 399,
            originalPrice: 450,
            isNew: true,
        },
        {
            id: 8,
            name: "HP DeskJet 4255e Wireless Printer",
            image: "/images/best_seller_product (2).png",
            alt: "HP DeskJet 4255e Wireless Printer",
            rating: 3,
            currentPrice: 409,
            originalPrice: 430,
            isNew: true,
        },
        {
            id: 9,
            name: "Optoma UHZ35ST Projector",
            image: "/images/best_seller_product (3).png",
            alt: "Optoma UHZ35ST 4K Projector",
            rating: 4,
            currentPrice: 199,
            originalPrice: 250,
            isNew: true,
        },
        {
            id: 10,
            name: "Canon EOS Rebel T7 DSLR Camera",
            image: "/images/best_seller_product (4).png",
            alt: "Canon EOS Rebel T7 DSLR Camera",
            rating: 3,
            currentPrice: 379,
            originalPrice: 400,
            isNew: true,
        },
    ],
    Engine: [
        {
            id: 11,
            name: "Optoma UHZ35ST Projector",
            image: "/images/best_seller_product (3).png",
            alt: "Optoma UHZ35ST Projector",
            rating: 4,
            currentPrice: 219,
            originalPrice: 260,
            isNew: true,
        },
        {
            id: 12,
            name: 'SAMSUNG Galaxy A7 Lite 8.7" 32GB Android',
            image: "/images/best_seller_product (1).png",
            alt: "Samsung Galaxy Tablet",
            rating: 3,
            currentPrice: 389,
            originalPrice: 440,
            isNew: true,
        },
        {
            id: 13,
            name: "Canon EOS Rebel T7 DSLR Camera",
            image: "/images/best_seller_product (4).png",
            alt: "Canon EOS Camera",
            rating: 4,
            currentPrice: 369,
            originalPrice: 410,
            isNew: true,
        },
        {
            id: 14,
            name: "HP DeskJet 4255e Wireless Printer",
            image: "/images/best_seller_product (2).png",
            alt: "HP Printer",
            rating: 3,
            currentPrice: 395,
            originalPrice: 420,
            isNew: true,
        },
        {
            id: 15,
            name: "Canon EOS Rebel T7 DSLR Camera",
            image: "/images/best_seller_product (4).png",
            alt: "Canon Camera Alternate",
            rating: 4,
            currentPrice: 375,
            originalPrice: 405,
            isNew: true,
        },
    ],
    Transmission: [
        {
            id: 16,
            name: "HP DeskJet 4255e Wireless Printer",
            image: "/images/best_seller_product (2).png",
            alt: "HP Wireless Printer",
            rating: 4,
            currentPrice: 415,
            originalPrice: 445,
            isNew: true,
        },
        {
            id: 17,
            name: "Canon EOS Rebel T7 DSLR Camera",
            image: "/images/best_seller_product (4).png",
            alt: "Canon Rebel Camera",
            rating: 4,
            currentPrice: 385,
            originalPrice: 420,
            isNew: true,
        },
        {
            id: 18,
            name: 'SAMSUNG Galaxy A7 Lite 8.7" 32GB Android',
            image: "/images/best_seller_product (1).png",
            alt: "Galaxy Tab",
            rating: 3,
            currentPrice: 405,
            originalPrice: 460,
            isNew: true,
        },
        {
            id: 19,
            name: "Optoma UHZ35ST Projector",
            image: "/images/best_seller_product (3).png",
            alt: "Projector Device",
            rating: 3,
            currentPrice: 189,
            originalPrice: 230,
            isNew: true,
        },
    ],
    Battery: [
        {
            id: 20,
            name: "Canon EOS Rebel T7 DSLR Camera",
            image: "/images/best_seller_product (4).png",
            alt: "Canon Camera Battery Bundle",
            rating: 4,
            currentPrice: 370,
            originalPrice: 399,
            isNew: true,
        },
        {
            id: 21,
            name: 'SAMSUNG Galaxy A7 Lite 8.7" 32GB Android',
            image: "/images/best_seller_product (1).png",
            alt: "Samsung Galaxy Tab",
            rating: 3,
            currentPrice: 399,
            originalPrice: 450,
            isNew: true,
        },
        {
            id: 22,
            name: "HP DeskJet 4255e Wireless Printer",
            image: "/images/best_seller_product (2).png",
            alt: "HP DeskJet Printer",
            rating: 3,
            currentPrice: 409,
            originalPrice: 430,
            isNew: true,
        },
        {
            id: 23,
            name: "Optoma UHZ35ST Projector",
            image: "/images/best_seller_product (3).png",
            alt: "Optoma Projector",
            rating: 3,
            currentPrice: 199,
            originalPrice: 250,
            isNew: true,
        },
    ],
};

function StarRating({ rating }: { rating: number }) {
    return (
        <div
            className="flex items-center gap-1 my-2"
            aria-label={`Rating: ${rating} out of 5 stars`}
        >
            {[1, 2, 3, 4, 5].map((star) => (
                <svg
                    key={star}
                    width="14"
                    height="14"
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

export default function BestSellerSection() {
    const [activeTab, setActiveTab] = useState<TabCategory>("Fuel Tank");
    const [currentIndex, setCurrentIndex] = useState(0);

    const products = bestSellerProductsByTab[activeTab];
    const maxIndex = Math.max(0, products.length - 4);
    const canSlide = products.length > 4;

    const handleTabChange = (tab: TabCategory) => {
        setActiveTab(tab);
        setCurrentIndex(0);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
    };

    return (
        <section
            aria-label="Best Seller Products"
            className="w-full py-8 bg-bg-base transition-colors duration-200"
        >
            <div className="container mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    {/* ================= Left: Promo Banner ================= */}
                    <aside className="lg:col-span-3 w-full relative overflow-hidden rounded-2xl bg-bg-surface border border-border-default flex flex-col justify-between p-6 sm:p-8 min-h-[520px]">
                        {/* 25% Offer Badge */}
                        <div
                            className="absolute top-16 right-5 w-16 h-16 rounded-full bg-brand-primary text-white flex flex-col items-center justify-center text-center shadow-lg z-20"
                            aria-label="25 percent offer"
                        >
                            <span className="text-base font-black leading-none tracking-tight">
                                25%
                            </span>
                            <span className="text-xs font-semibold leading-tight">
                                offer
                            </span>
                        </div>

                        {/* Banner Top Info */}
                        <div className="relative z-10 flex flex-col items-start pr-14">
                            <span className="bg-brand-primary text-white text-xs font-bold px-3 py-1 rounded mb-3 inline-block">
                                New
                            </span>

                            <h2 className="text-text-primary text-lg sm:text-xl font-bold uppercase leading-snug mb-3">
                                CLOUD CAM, SECURITY CAMERA
                            </h2>

                            <div className="flex items-baseline text-brand-primary mb-5">
                                <span className="flex flex-col text-[10px] font-bold uppercase leading-none mr-1.5 self-center">
                                    <span>Up</span>
                                    <span>To</span>
                                </span>
                                <span className="text-3xl sm:text-4xl font-black leading-none">
                                    70
                                </span>
                                <span className="text-sm font-bold ml-0.5">
                                    %
                                </span>
                            </div>

                            <Link
                                href="/shop?category=cloud-cam"
                                className="inline-flex items-center gap-2 border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white text-xs sm:text-[13px] font-bold uppercase px-5 py-2.5 rounded-full transition-all duration-200 group bg-bg-surface"
                            >
                                <span>SHOP NOW</span>
                                <span
                                    aria-hidden="true"
                                    className="transition-transform group-hover:translate-x-1"
                                >
                                    &rarr;
                                </span>
                            </Link>
                        </div>

                        {/* Desk Phone Image */}
                        <div className="relative z-10 mt-8 w-full flex justify-center items-end">
                            <div className="relative w-[230px] h-[210px] sm:w-[250px] sm:h-[230px]">
                                <Image
                                    src="/images/best_seller_product_banner_poset_image.png"
                                    alt="Cloud Cam Security Deskphone"
                                    fill
                                    sizes="(max-width: 768px) 230px, 250px"
                                    className="object-contain drop-shadow-md"
                                    priority
                                />
                            </div>
                        </div>
                    </aside>

                    {/* ================= Right: Product Frame with Matched Height ================= */}
                    <div className="lg:col-span-9 w-full flex flex-col justify-between">
                        {/* Tabs Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 mb-4 border-b border-border-default/60">
                            <div className="relative">
                                <h2 className="text-text-primary text-xl sm:text-2xl font-bold tracking-tight pb-2">
                                    Best Seller Product
                                </h2>
                                <span className="absolute bottom-0 left-0 w-28 h-[2.5px] bg-brand-primary" />
                            </div>

                            <nav
                                aria-label="Best seller category tabs"
                                className="flex items-center gap-4 sm:gap-6 overflow-x-auto pb-1 sm:pb-0 scrollbar-none"
                            >
                                {tabCategories.map((tab) => {
                                    const isActive = activeTab === tab;
                                    return (
                                        <button
                                            key={tab}
                                            type="button"
                                            onClick={() => handleTabChange(tab)}
                                            className={`text-xs sm:text-[14px] font-medium transition-colors relative pb-2 whitespace-nowrap cursor-pointer ${
                                                isActive
                                                    ? "text-brand-primary font-semibold"
                                                    : "text-text-secondary hover:text-text-primary"
                                            }`}
                                        >
                                            {tab}
                                            {isActive && (
                                                <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-brand-primary" />
                                            )}
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Height-Adjusted Frame (h-full flex-1) */}
                        <div className="relative w-full flex-1 rounded-xl border-2 border-brand-primary bg-bg-surface p-4 sm:p-6 shadow-xs flex items-center">
                            {/* Conditional Previous Arrow */}
                            {canSlide && currentIndex > 0 && (
                                <button
                                    type="button"
                                    onClick={handlePrev}
                                    aria-label="Previous products"
                                    className="absolute -left-4 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-bg-surface border border-border-default text-brand-primary flex items-center justify-center shadow-md hover:bg-brand-primary hover:text-white transition-all cursor-pointer"
                                >
                                    <svg
                                        width="15"
                                        height="15"
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
                            )}

                            {/* Slider Viewport */}
                            <div className="w-full h-full overflow-hidden flex items-center">
                                <motion.div
                                    className="w-full flex flex-nowrap items-stretch divide-x divide-border-default/60"
                                    animate={{
                                        x: `-${currentIndex * 25}%`,
                                    }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 260,
                                        damping: 28,
                                    }}
                                >
                                    {products.map((product) => (
                                        <article
                                            key={product.id}
                                            className="w-full sm:w-1/2 md:w-1/3 xl:w-1/4 shrink-0 flex flex-col justify-between items-center text-center px-4 py-4"
                                        >
                                            {/* NEW Badge */}
                                            <div className="w-full flex justify-start">
                                                {product.isNew && (
                                                    <div className="-skew-x-12 bg-brand-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-xs tracking-wider mb-2">
                                                        <span className="skew-x-12 inline-block">
                                                            NEW
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Enlarged Image Area */}
                                            <div className="relative w-full h-[180px] sm:h-[210px] flex items-center justify-center my-2">
                                                <Image
                                                    src={product.image}
                                                    alt={product.alt}
                                                    fill
                                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                                    className="object-contain p-2 transition-transform duration-300 hover:scale-105"
                                                />
                                            </div>

                                            {/* Meta Information */}
                                            <div className="w-full flex flex-col items-center mt-3">
                                                <StarRating
                                                    rating={product.rating}
                                                />

                                                <h3 className="text-text-primary text-[13px] sm:text-[14px] font-medium leading-snug line-clamp-2 h-[38px] my-1 hover:text-brand-primary transition-colors">
                                                    <Link
                                                        href={`/shop/product/${product.id}`}
                                                    >
                                                        {product.name}
                                                    </Link>
                                                </h3>

                                                <div className="flex items-center gap-1.5 text-xs sm:text-[13px] font-semibold mt-2">
                                                    <span className="text-brand-primary">
                                                        (${product.currentPrice}
                                                    </span>
                                                    <span className="text-text-secondary font-normal">
                                                        -
                                                    </span>
                                                    <span className="text-text-secondary line-through font-normal">
                                                        ${product.originalPrice}
                                                        )
                                                    </span>
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </motion.div>
                            </div>

                            {/* Conditional Next Arrow */}
                            {canSlide && currentIndex < maxIndex && (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    aria-label="Next products"
                                    className="absolute -right-4 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-bg-surface border border-border-default text-brand-primary flex items-center justify-center shadow-md hover:bg-brand-primary hover:text-white transition-all cursor-pointer"
                                >
                                    <svg
                                        width="15"
                                        height="15"
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
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
