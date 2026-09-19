"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// ======================= DATA ARRAY 1: Gaming Accessories =======================
interface GridItem {
    id: number;
    name: string;
    image: string;
    alt: string;
    link: string;
}

const gamingAccessoriesData: GridItem[] = [
    {
        id: 1,
        name: "Headsets",
        image: "/images/top_products (2).png",
        alt: "Gaming Headset with Surround Sound",
        link: "/shop?category=gaming-headsets",
    },
    {
        id: 2,
        name: "Keyboards",
        image: "/images/top_products (1).png",
        alt: "RGB Mechanical Gaming Keyboard",
        link: "/shop?category=gaming-keyboards",
    },
    {
        id: 3,
        name: "Keyboards",
        image: "/images/products_group (3).jpg",
        alt: "High Precision Optical Mouse",
        link: "/shop?category=gaming-mice",
    },
    {
        id: 4,
        name: "Chairs",
        image: "/images/products_group (4).jpg",
        alt: "Ergonomic Racing Gaming Chair",
        link: "/shop?category=gaming-chairs",
    },
];

// ======================= DATA ARRAY 2: Fashion Deals =======================
interface FashionItem {
    id: number;
    dealLabel: string;
    image: string;
    alt: string;
    link: string;
}

const fashionDealsData: FashionItem[] = [
    {
        id: 1,
        dealLabel: "Tops under $25",
        image: "/images/products_group (5).jpg",
        alt: "Graphic Summer Tops and Camis",
        link: "/shop?deals=tops-under-25",
    },
    {
        id: 2,
        dealLabel: "Jeans under $50",
        image: "/images/products_group (6).jpg",
        alt: "Classic Wash Denim Jeans",
        link: "/shop?deals=jeans-under-50",
    },
    {
        id: 3,
        dealLabel: "Dresses under $30",
        image: "/images/products_group (7).jpg",
        alt: "Satin Slip Dresses",
        link: "/shop?deals=dresses-under-30",
    },
    {
        id: 4,
        dealLabel: "Shoes under $50",
        image: "/images/products_group (8).jpg",
        alt: "Block Heel Suede Ankle Boots",
        link: "/shop?deals=shoes-under-50",
    },
];

// ======================= DATA ARRAY 3: Best Selling Slider =======================
interface SliderItem {
    id: number;
    title: string;
    discount: string;
    image: string;
    alt: string;
    link: string;
}

const bestSellingSliderData: SliderItem[] = [
    {
        id: 1,
        title: "Dual Mic Gaming Earbuds",
        discount: "Get 25% Discount",
        image: "/images/products_group (4).jpg",
        alt: "Noise-Isolating Gaming Earbuds",
        link: "/shop?product=gaming-earbuds",
    },
    {
        id: 2,
        title: "Studio Wireless Headset",
        discount: "Get 35% Discount",
        image: "/images/products_group (3).jpg",
        alt: "Over-Ear Wireless Headset",
        link: "/shop?product=wireless-headset",
    },
    {
        id: 3,
        title: "Curved 4K Display Monitor",
        discount: "Get 20% Discount",
        image: "/images/top_products (4).png",
        alt: "Ultra-wide Curved Screen Monitor",
        link: "/shop?product=curved-monitor",
    },
];

interface LaunchedItem {
    id: number;
    name: string;
    image: string;
    alt: string;
    link: string;
    isLarge: boolean; // First item gets the tall 7-column layout, others get the stacked 5-column layout
}

const launchedProductsData: LaunchedItem[] = [
    {
        id: 1,
        name: "Headsets",
        image: "/images/products_group (1).png",
        alt: "MagSafe Silicone Phone Case Cover",
        link: "/shop?product=magsafe-iphone-case",
        isLarge: true,
    },
    {
        id: 2,
        name: "Watch",
        image: "/images/products_group (2).jpg",
        alt: "Diamond Dial Gold Automatic Watch",
        link: "/shop?product=gold-watch",
        isLarge: false,
    },
    {
        id: 3,
        name: "Chains",
        image: "/images/products_group (3).jpg",
        alt: "Sterling Silver Italian Chain",
        link: "/shop?product=silver-chain",
        isLarge: false,
    },
];

export default function ProductGroupsSection() {
    const [sliderIndex, setSliderIndex] = useState(0);

    const prevSlide = () => {
        setSliderIndex((prev) =>
            prev === 0 ? bestSellingSliderData.length - 1 : prev - 1,
        );
    };

    const nextSlide = () => {
        setSliderIndex((prev) =>
            prev === bestSellingSliderData.length - 1 ? 0 : prev + 1,
        );
    };

    return (
        <section
            aria-label="Product Showcase Collections"
            className="w-full py-6 bg-bg-base transition-colors duration-200"
        >
            <div className="container mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
                    {/* ================= CARD 1: Gaming Accessories (from Array 1) ================= */}
                    <article className="flex flex-col justify-between bg-bg-surface border border-border-default rounded-xl p-4 sm:p-5 transition-all duration-200 hover:shadow-md">
                        <div>
                            <h2 className="text-text-primary text-[17px] font-bold tracking-tight mb-3">
                                Gaming Accessories
                            </h2>

                            <div className="grid grid-cols-2 gap-2.5">
                                {gamingAccessoriesData.map((item) => (
                                    <Link
                                        key={item.id}
                                        href={item.link}
                                        className="group flex flex-col items-start"
                                    >
                                        <div className="relative w-full h-22 rounded-lg bg-bg-subtle p-2 flex items-center justify-center overflow-hidden border border-border-default/40">
                                            <Image
                                                src={item.image}
                                                alt={item.alt}
                                                fill
                                                sizes="(max-width: 768px) 50vw, 150px"
                                                className="object-contain p-1 transition-transform duration-300 group-hover:scale-105"
                                            />
                                        </div>
                                        <span className="text-text-primary text-[12px] font-medium mt-1.5 leading-tight group-hover:text-brand-primary transition-colors">
                                            {item.name}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <Link
                            href="/shop?category=gaming"
                            className="mt-3.5 text-[13px] font-medium text-text-secondary hover:text-brand-primary transition-colors inline-block"
                        >
                            See more
                        </Link>
                    </article>

                    {/* ================= CARD 2: Shop Deals in Fashion (from Array 2) ================= */}
                    <article className="flex flex-col justify-between bg-bg-surface border border-border-default rounded-xl p-4 sm:p-5 transition-all duration-200 hover:shadow-md">
                        <div>
                            <h2 className="text-text-primary text-[17px] font-bold tracking-tight mb-3">
                                Shop Deals in Fashion
                            </h2>

                            <div className="grid grid-cols-2 gap-2.5">
                                {fashionDealsData.map((item) => (
                                    <Link
                                        key={item.id}
                                        href={item.link}
                                        className="group flex flex-col items-start"
                                    >
                                        <div className="relative w-full h-22 rounded-lg overflow-hidden border border-border-default/40 bg-bg-subtle">
                                            <Image
                                                src={item.image}
                                                alt={item.alt}
                                                fill
                                                sizes="(max-width: 768px) 50vw, 150px"
                                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                        </div>
                                        <span className="text-text-primary text-[12px] font-medium mt-1.5 leading-tight group-hover:text-brand-primary transition-colors">
                                            {item.dealLabel}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <Link
                            href="/shop?category=fashion"
                            className="mt-3.5 text-[13px] font-medium text-text-secondary hover:text-brand-primary transition-colors inline-block"
                        >
                            See more
                        </Link>
                    </article>

                    {/* ================= CARD 3: Launched in the last 30 days ================= */}
                    <article className="flex flex-col justify-between bg-bg-surface border border-border-default rounded-xl p-4 sm:p-5 transition-all duration-200 hover:shadow-md">
                        <div>
                            <h2 className="text-text-primary text-[17px] font-bold tracking-tight mb-3">
                                Launched in the last 30 days
                            </h2>

                            <div className="grid grid-cols-12 gap-2.5 h-49">
                                {/* 1. Featured Large Item (Left Column) */}
                                {launchedProductsData
                                    .filter((item) => item.isLarge)
                                    .map((largeItem) => (
                                        <Link
                                            key={largeItem.id}
                                            href={largeItem.link}
                                            className="col-span-7 group flex flex-col h-full"
                                        >
                                            <div className="relative w-full flex-1 rounded-lg overflow-hidden border border-border-default/40 bg-bg-subtle">
                                                <Image
                                                    src={largeItem.image}
                                                    alt={largeItem.alt}
                                                    fill
                                                    sizes="(max-width: 768px) 60vw, 180px"
                                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                />
                                            </div>
                                            <span className="text-text-primary text-[12px] font-medium mt-1.5 leading-tight group-hover:text-brand-primary transition-colors">
                                                {largeItem.name}
                                            </span>
                                        </Link>
                                    ))}

                                {/* 2. Stacked Smaller Items (Right Column) */}
                                <div className="col-span-5 flex flex-col justify-between h-full gap-2">
                                    {launchedProductsData
                                        .filter((item) => !item.isLarge)
                                        .map((smallItem) => (
                                            <Link
                                                key={smallItem.id}
                                                href={smallItem.link}
                                                className="group flex flex-col"
                                            >
                                                <div className="relative w-full h-18.5 rounded-lg overflow-hidden border border-border-default/40 bg-bg-subtle">
                                                    <Image
                                                        src={smallItem.image}
                                                        alt={smallItem.alt}
                                                        fill
                                                        sizes="(max-width: 768px) 40vw, 120px"
                                                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                    />
                                                </div>
                                                <span className="text-text-primary text-[12px] font-medium mt-1 leading-tight group-hover:text-brand-primary transition-colors">
                                                    {smallItem.name}
                                                </span>
                                            </Link>
                                        ))}
                                </div>
                            </div>
                        </div>

                        <Link
                            href="/shop?filter=new-arrivals"
                            className="mt-3.5 text-[13px] font-medium text-text-secondary hover:text-brand-primary transition-colors inline-block"
                        >
                            See more
                        </Link>
                    </article>

                    {/* ================= CARD 4: Best Selling Products Slider (from Array 3) ================= */}
                    <article className="flex flex-col justify-between bg-bg-surface border border-border-default rounded-xl p-4 sm:p-5 transition-all duration-200 hover:shadow-md">
                        <div>
                            <h2 className="text-text-primary text-[17px] font-bold tracking-tight">
                                Best Selling Products
                            </h2>
                            <p className="text-text-secondary text-[12px] font-normal mb-3">
                                Get discounts on popular items
                            </p>

                            <div className="relative w-full h-49 bg-bg-base border border-border-default/50 rounded-lg p-3 flex flex-col items-center justify-between overflow-hidden">
                                {/* Previous Button */}
                                <button
                                    type="button"
                                    onClick={prevSlide}
                                    aria-label="Previous Slide"
                                    className="absolute left-2 top-1/2 -translate-y-6 z-20 w-7 h-7 rounded-full bg-bg-surface/90 border border-border-default text-text-primary flex items-center justify-center shadow-xs hover:text-brand-primary hover:border-brand-primary transition-colors cursor-pointer"
                                >
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.4"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M15 18l-6-6 6-6" />
                                    </svg>
                                </button>

                                {/* Animated Slide */}
                                <div className="relative w-full h-35 flex items-center justify-center">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={
                                                bestSellingSliderData[
                                                    sliderIndex
                                                ].id
                                            }
                                            initial={{ opacity: 0, x: 25 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -25 }}
                                            transition={{
                                                duration: 0.22,
                                                ease: "easeInOut",
                                            }}
                                            className="relative w-full h-full flex items-center justify-center"
                                        >
                                            <Image
                                                src={
                                                    bestSellingSliderData[
                                                        sliderIndex
                                                    ].image
                                                }
                                                alt={
                                                    bestSellingSliderData[
                                                        sliderIndex
                                                    ].alt
                                                }
                                                fill
                                                sizes="(max-width: 768px) 100vw, 250px"
                                                className="object-contain p-2"
                                            />
                                        </motion.div>
                                    </AnimatePresence>
                                </div>

                                {/* Next Button */}
                                <button
                                    type="button"
                                    onClick={nextSlide}
                                    aria-label="Next Slide"
                                    className="absolute right-2 top-1/2 -translate-y-6 z-20 w-7 h-7 rounded-full bg-bg-surface/90 border border-border-default text-text-primary flex items-center justify-center shadow-xs hover:text-brand-primary hover:border-brand-primary transition-colors cursor-pointer"
                                >
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.4"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M9 18l6-6-6-6" />
                                    </svg>
                                </button>

                                {/* Live Offer Label */}
                                <span className="text-text-primary text-[13px] font-semibold tracking-tight text-center z-10">
                                    {
                                        bestSellingSliderData[sliderIndex]
                                            .discount
                                    }
                                </span>
                            </div>
                        </div>

                        <Link
                            href={bestSellingSliderData[sliderIndex].link}
                            className="mt-3.5 text-[13px] font-medium text-text-secondary hover:text-brand-primary transition-colors inline-block"
                        >
                            See more
                        </Link>
                    </article>
                </div>
            </div>
        </section>
    );
}
