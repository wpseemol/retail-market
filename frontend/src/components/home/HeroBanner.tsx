import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function HeroBanner() {
    return (
        <section
            aria-label="Featured Promotions"
            className="w-full py-6 bg-bg-base transition-colors duration-200"
        >
            <div className="container mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* ================= Left: Main Hero Banner (Canon DSLR) ================= */}
                <article className="lg:col-span-8 relative overflow-hidden rounded-xl bg-bg-surface border border-border-default flex flex-col md:flex-row items-center justify-between p-8 sm:p-12 min-h-[380px]">
                    {/* Subtle Halftone/Wave Background Graphic */}
                    <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-10 z-0">
                        <Image
                            src="/images/hero_bg_06 1.png"
                            alt=""
                            fill
                            priority
                            className="object-cover"
                            aria-hidden="true"
                        />
                    </div>

                    {/* Left Content Area */}
                    <div className="relative z-10 flex flex-col items-start max-w-sm">
                        <span className="text-brand-primary text-xs sm:text-sm font-medium tracking-wide mb-2">
                            Widescreen 4k .......
                        </span>

                        <h1 className="text-text-primary text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight uppercase mb-3 flex items-center gap-2">
                            <span>DIGITAL SLR CAMERA HIGH DEFINATION</span>
                            <Image
                                src="/icons/hero_Polygon 1.svg"
                                alt=""
                                width={14}
                                height={14}
                                className="inline-block shrink-0"
                                aria-hidden="true"
                            />
                        </h1>

                        <p className="text-text-secondary text-xs sm:text-sm mb-4 leading-relaxed">
                            Sumptuous, filling, and temptingly
                        </p>

                        {/* Discount & Price Badges */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className="flex items-baseline text-brand-primary">
                                <span className="text-xs font-semibold uppercase mr-1">
                                    Up To
                                </span>
                                <span className="text-3xl sm:text-4xl font-black">
                                    70
                                </span>
                                <span className="text-lg font-bold">%</span>
                            </div>
                            <span className="text-brand-primary text-lg sm:text-xl font-bold">
                                $ 180.99
                            </span>
                        </div>

                        {/* CTA Button */}
                        <Link
                            href="/shop"
                            className="inline-flex items-center gap-2 bg-text-primary text-bg-base hover:bg-brand-primary hover:text-white text-xs sm:text-sm font-semibold uppercase px-6 py-3 rounded-full transition-all duration-200"
                        >
                            <span>SHOP NOW</span>
                            <span aria-hidden="true">&rarr;</span>
                        </Link>
                    </div>

                    {/* Right Product Image Area */}
                    <div className="relative z-10 mt-6 md:mt-0 w-full md:w-1/2 flex justify-center items-center">
                        <div className="relative w-[280px] h-[230px] sm:w-[340px] sm:h-[280px]">
                            <Image
                                src="/images/camera.png"
                                alt="Canon EOS 77D DSLR Camera"
                                fill
                                priority
                                className="object-contain drop-shadow-xl"
                            />
                        </div>
                    </div>
                </article>

                {/* ================= Right: Sub Promotion Banner (Security & Phone) ================= */}
                <aside className="lg:col-span-4 relative overflow-hidden rounded-xl bg-bg-surface border border-border-default flex flex-col justify-between p-6 sm:p-8 min-h-[380px]">
                    {/* Offer Badge (Top Right Burst) */}
                    <div
                        className="absolute top-6 right-6 w-14 h-14 rounded-full bg-brand-primary text-white flex flex-col items-center justify-center text-center shadow-md z-20"
                        aria-label="25 percent offer"
                    >
                        <span className="text-xs font-black leading-none">
                            25%
                        </span>
                        <span className="text-[10px] font-semibold leading-tight">
                            offer
                        </span>
                    </div>

                    {/* Top Content Area */}
                    <div className="relative z-10 flex flex-col items-start pr-12">
                        <span className="bg-brand-primary text-white text-[11px] font-bold uppercase px-2.5 py-0.5 rounded mb-3">
                            New
                        </span>

                        <h2 className="text-text-primary text-base sm:text-lg font-bold uppercase leading-snug mb-2">
                            CLOUD CAM, SECURITY CAMERA
                        </h2>

                        <div className="flex items-baseline text-brand-primary mb-3">
                            <span className="text-xs font-semibold uppercase mr-1">
                                Up To
                            </span>
                            <span className="text-2xl sm:text-3xl font-black">
                                70
                            </span>
                            <span className="text-sm font-bold">%</span>
                        </div>

                        {/* Outlined Pill Action */}
                        <Link
                            href="/shop"
                            className="inline-flex items-center gap-2 border border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white text-xs font-bold uppercase px-4 py-1.5 rounded-full transition-all duration-200"
                        >
                            <span>SHOP NOW</span>
                            <span aria-hidden="true">&rarr;</span>
                        </Link>
                    </div>

                    {/* Product Phones Graphic */}
                    <div className="relative z-10 mt-4 w-full flex justify-center">
                        <div className="relative w-[180px] h-[190px] sm:w-[200px] sm:h-[210px]">
                            <Image
                                src="/images/img_57 1.png"
                                alt="Smartphone Device Offer"
                                fill
                                className="object-contain drop-shadow-lg"
                            />
                        </div>
                    </div>
                </aside>
            </div>
        </section>
    );
}
