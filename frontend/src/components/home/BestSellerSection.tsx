"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

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

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function prefersReducedMotion() {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

export default function BestSellerSection(_props: {
  content?: import("@/lib/homeBlockDefaults").BestSellersContent;
} = {}) {
    const [activeTab, setActiveTab] = useState<TabCategory>("Fuel Tank");
    const [rawIndex, setCurrentIndex] = useState(0);
    const [itemsPerView, setItemsPerView] = useState(4);
    const [tabDir, setTabDir] = useState<1 | -1>(1);
    const stageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateItemsPerView = () => {
            const width = window.innerWidth;
            if (width >= 1280) setItemsPerView(4);
            else if (width >= 768) setItemsPerView(3);
            else if (width >= 640) setItemsPerView(2);
            else setItemsPerView(1);
        };

        updateItemsPerView();
        window.addEventListener("resize", updateItemsPerView);
        return () => window.removeEventListener("resize", updateItemsPerView);
    }, []);

    const products = bestSellerProductsByTab[activeTab];
    const maxIndex = Math.max(0, products.length - itemsPerView);
    const canSlide = products.length > itemsPerView;
    const slidePercent = 100 / itemsPerView;
    const currentIndex = Math.min(rawIndex, maxIndex);

    // Tab change: WAAPI enter (framer-motion is disabled site-wide).
    useLayoutEffect(() => {
        const stage = stageRef.current;
        if (!stage) return;
        stage.getAnimations().forEach((a) => a.cancel());
        if (prefersReducedMotion()) return;

        stage.animate(
            [
                {
                    opacity: 0,
                    transform: `translate3d(${tabDir > 0 ? 28 : -28}px, 10px, 0)`,
                },
                { opacity: 1, transform: "translate3d(0, 0, 0)" },
            ],
            { duration: 420, easing: EASE, fill: "both" },
        );

        stage.querySelectorAll<HTMLElement>("[data-bs-card]").forEach((card, i) => {
            card.getAnimations().forEach((a) => a.cancel());
            card.animate(
                [
                    {
                        opacity: 0,
                        transform: `translate3d(0, ${tabDir > 0 ? 16 : -16}px, 0)`,
                    },
                    { opacity: 1, transform: "translate3d(0, 0, 0)" },
                ],
                {
                    duration: 400,
                    delay: 50 + i * 55,
                    easing: EASE,
                    fill: "both",
                },
            );
        });
    }, [activeTab, tabDir]);

    const handleTabChange = (tab: TabCategory) => {
        if (tab === activeTab) return;
        const from = tabCategories.indexOf(activeTab);
        const to = tabCategories.indexOf(tab);
        setTabDir(to >= from ? 1 : -1);
        setActiveTab(tab);
        setCurrentIndex(0);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => Math.max(0, Math.min(prev, maxIndex) - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
    };

    const arrowBtn =
        "absolute top-1/2 z-30 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border-default bg-bg-surface text-brand-primary shadow-md transition-all duration-200 cursor-pointer hover:scale-110 hover:bg-brand-primary hover:text-white hover:shadow-lg active:scale-95 disabled:pointer-events-none disabled:opacity-0";

    return (
        <section
            aria-label="Best Seller Products"
            className="w-full bg-bg-base py-8 transition-colors duration-200"
        >
            <div className="container mx-auto">
                <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
                    {/* ================= Left: Promo Banner ================= */}
                    <aside className="relative flex min-h-130 w-full flex-col justify-between overflow-hidden rounded-2xl border border-border-default bg-bg-surface p-6 sm:p-8 lg:col-span-3">
                        <div
                            className="absolute top-16 right-5 z-20 flex size-16 flex-col items-center justify-center rounded-full bg-brand-primary text-center text-white shadow-lg"
                            aria-label="25 percent offer"
                        >
                            <span className="text-base leading-none font-black tracking-tight">
                                25%
                            </span>
                            <span className="text-xs leading-tight font-semibold">
                                offer
                            </span>
                        </div>

                        <div className="relative z-10 flex flex-col items-start pr-14">
                            <span className="mb-3 inline-block rounded bg-brand-primary px-3 py-1 text-xs font-bold text-white">
                                New
                            </span>

                            <h2 className="mb-3 text-lg leading-snug font-bold text-text-primary uppercase sm:text-xl">
                                CLOUD CAM, SECURITY CAMERA
                            </h2>

                            <div className="mb-5 flex items-baseline text-brand-primary">
                                <span className="mr-1.5 flex flex-col self-center text-2.5 leading-none font-bold uppercase">
                                    <span>Up</span>
                                    <span>To</span>
                                </span>
                                <span className="text-3xl leading-none font-black sm:text-4xl">
                                    70
                                </span>
                                <span className="ml-0.5 text-sm font-bold">%</span>
                            </div>

                            <Link
                                href="/shop?category=cloud-cam"
                                className="group inline-flex items-center gap-2 rounded-full border-2 border-brand-primary bg-bg-surface px-5 py-2.5 text-xs font-bold text-brand-primary uppercase transition-all duration-200 hover:bg-brand-primary hover:text-white sm:text-[13px]"
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

                        <div className="relative z-10 mt-8 flex w-full items-end justify-center">
                            <div className="relative h-52.5 w-57.5 sm:h-57.5 sm:w-62.5">
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

                    {/* ================= Right: Product Frame ================= */}
                    <div className="flex w-full flex-col justify-between lg:col-span-9">
                        <div className="mb-4 flex flex-col justify-between gap-4 border-b border-border-default/60 pb-2 sm:flex-row sm:items-center">
                            <div className="relative">
                                <h2 className="pb-2 text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
                                    Best Seller Product
                                </h2>
                                <span className="absolute bottom-0 left-0 h-[2.5px] w-28 bg-brand-primary" />
                            </div>

                            <nav
                                aria-label="Best seller category tabs"
                                className="scrollbar-none flex items-center gap-4 overflow-x-auto pb-1 sm:gap-6 sm:pb-0"
                            >
                                {tabCategories.map((tab) => {
                                    const isActive = activeTab === tab;
                                    return (
                                        <button
                                            key={tab}
                                            type="button"
                                            onClick={() => handleTabChange(tab)}
                                            aria-pressed={isActive}
                                            className={`relative cursor-pointer pb-2 text-xs font-medium whitespace-nowrap transition-colors sm:text-sm ${
                                                isActive
                                                    ? "font-semibold text-brand-primary"
                                                    : "text-text-secondary hover:text-text-primary"
                                            }`}
                                        >
                                            {tab}
                                            <span
                                                aria-hidden
                                                className={`absolute bottom-0 left-0 h-[2.5px] bg-brand-primary transition-all duration-300 ${
                                                    isActive ? "w-full" : "w-0"
                                                }`}
                                            />
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>

                        <div className="relative flex w-full flex-1 items-center overflow-hidden rounded-xl border-2 border-brand-primary bg-bg-surface p-4 shadow-xs sm:overflow-visible sm:p-6">
                            {canSlide ? (
                                <button
                                    type="button"
                                    onClick={handlePrev}
                                    disabled={currentIndex <= 0}
                                    aria-label="Previous products"
                                    className={`${arrowBtn} left-1 sm:-left-4`}
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
                                        aria-hidden
                                    >
                                        <path d="M15 18l-6-6 6-6" />
                                    </svg>
                                </button>
                            ) : null}

                            <div
                                ref={stageRef}
                                className="flex h-full w-full items-center overflow-hidden"
                            >
                                {/* CSS transition — site allows transitions; framer-motion is skipped. */}
                                <div
                                    className="flex w-full flex-nowrap items-stretch divide-x divide-border-default/60 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                                    style={{
                                        transform: `translate3d(-${currentIndex * slidePercent}%, 0, 0)`,
                                    }}
                                >
                                    {products.map((product) => (
                                        <article
                                            key={`${activeTab}-${product.id}`}
                                            data-bs-card
                                            className="flex w-full shrink-0 flex-col items-center justify-between px-4 py-4 text-center sm:w-1/2 md:w-1/3 xl:w-1/4"
                                        >
                                            <div className="flex w-full justify-start">
                                                {product.isNew ? (
                                                    <div className="-skew-x-12 mb-2 rounded-xs bg-brand-primary px-2 py-0.5 text-2.5 font-bold tracking-wider text-white">
                                                        <span className="inline-block skew-x-12">
                                                            NEW
                                                        </span>
                                                    </div>
                                                ) : null}
                                            </div>

                                            <div className="relative my-2 flex h-44 w-full items-center justify-center sm:h-48">
                                                <Image
                                                    src={product.image}
                                                    alt={product.alt}
                                                    fill
                                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                                    className="object-contain p-2 transition-transform duration-300 hover:scale-105"
                                                />
                                            </div>

                                            <div className="mt-3 flex w-full flex-col items-center">
                                                <StarRating rating={product.rating} />

                                                <h3 className="my-1 h-9.5 text-[13px] leading-snug font-medium text-text-primary transition-colors line-clamp-2 hover:text-brand-primary sm:text-sm">
                                                    <Link href="/shop">{product.name}</Link>
                                                </h3>

                                                <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold sm:text-[13px]">
                                                    <span className="text-brand-primary">
                                                        ${product.currentPrice}
                                                    </span>
                                                    <span className="font-normal text-text-secondary line-through">
                                                        ${product.originalPrice}
                                                    </span>
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </div>

                            {canSlide ? (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    disabled={currentIndex >= maxIndex}
                                    aria-label="Next products"
                                    className={`${arrowBtn} right-1 sm:-right-4`}
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
                                        aria-hidden
                                    >
                                        <path d="M9 18l6-6-6-6" />
                                    </svg>
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
