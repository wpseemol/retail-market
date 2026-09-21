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
                <article className="lg:col-span-8 relative overflow-hidden rounded-2xl bg-bg-surface border border-border-default flex flex-col md:flex-row items-center justify-between p-6 sm:p-12 lg:p-14 min-h-90 sm:min-h-105">
                    {/* Subtle Halftone Background Graphic */}
                    <div className="absolute inset-0 pointer-events-none opacity-50 dark:opacity-10 z-0">
                        <Image
                            src="/images/hero_bg_06 1.png"
                            alt=""
                            fill
                            sizes="(max-width: 1024px) 100vw, 66vw"
                            priority
                            className="object-cover"
                            aria-hidden="true"
                        />
                    </div>

                    {/* Left Content Area */}
                    <div className="relative z-10 flex flex-col items-start max-w-85 sm:max-w-95">
                        {/* Tagline with Floating Green Triangle */}
                        <div className="relative w-full mb-3">
                            <span className="text-brand-primary text-[13px] sm:text-sm font-medium tracking-wide">
                                Widescreen 4k .......
                            </span>
                            <Image
                                src="/icons/hero_Polygon 1.svg"
                                alt=""
                                width={16}
                                height={16}
                                className="absolute right-0 -top-1"
                                aria-hidden="true"
                            />
                        </div>

                        {/* Main Headline */}
                        <h1 className="text-text-primary text-2xl sm:text-3xl lg:text-[32px] font-extrabold leading-[1.15] tracking-tight uppercase mb-3">
                            DIGITAL SLR CAMERA HIGH DEFINITION
                        </h1>

                        {/* Subtext */}
                        <p className="text-text-secondary text-xs sm:text-sm font-normal mb-5 leading-relaxed">
                            Sumptuous, filling, and temptingly
                        </p>

                        {/* Discount & Price Badges */}
                        <div className="flex items-center gap-6 mb-7">
                            <div className="flex items-baseline text-brand-primary">
                                <span className="flex flex-col text-[11px] font-bold uppercase leading-none mr-1.5 self-center">
                                    <span>Up</span>
                                    <span>To</span>
                                </span>
                                <span className="text-4xl sm:text-5xl font-black leading-none">
                                    70
                                </span>
                                <span className="text-lg font-bold ml-0.5">
                                    %
                                </span>
                            </div>
                            <span className="text-brand-primary text-xl sm:text-2xl font-bold">
                                $ 180.99
                            </span>
                        </div>

                        {/* CTA Button */}
                        <Link
                            href="/shop"
                            className="inline-flex items-center gap-3 bg-black dark:bg-white text-white dark:text-black hover:bg-brand-primary dark:hover:bg-brand-primary dark:hover:text-white text-xs sm:text-[13px] font-bold uppercase tracking-wider px-7 py-3.5 rounded-full transition-all duration-200 group shadow-sm"
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

                    {/* Right Product Image Area */}
                    <div className="relative z-10 mt-8 md:mt-0 w-full md:w-1/2 flex justify-center items-center">
                        <div className="relative w-75 h-62.5 sm:w-95 sm:h-77.5 lg:w-110 lg:h-87.5">
                            <Image
                                src="/images/camera.png"
                                alt="Canon EOS 77D DSLR Camera"
                                fill
                                sizes="(max-width: 640px) 300px, (max-width: 1024px) 380px, 440px"
                                priority
                                className="object-contain"
                            />
                        </div>
                    </div>
                </article>

                {/* ================= Right: Sub Promotion Banner (Security & Phone) ================= */}
                <aside className="lg:col-span-4 relative overflow-hidden rounded-2xl bg-bg-surface border border-border-default flex flex-col justify-between p-6 sm:p-8 min-h-90 sm:min-h-105">
                    {/* Subtle Background Overlay */}
                    <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-10 z-0">
                        <Image
                            src="/images/hero_bg_06 1.png"
                            alt=""
                            fill
                            sizes="(max-width: 1024px) 100vw, 33vw"
                            className="object-cover"
                            aria-hidden="true"
                        />
                    </div>

                    {/* 25% Offer Badge (Scalloped Green Rosette on Right) */}
                    <div
                        className="absolute top-20 right-4 sm:top-24 sm:right-7 w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-brand-primary text-white flex flex-col items-center justify-center text-center shadow-lg z-20"
                        aria-label="25 percent offer"
                    >
                        <span className="text-sm sm:text-lg font-black leading-none tracking-tight">
                            25%
                        </span>
                        <span className="text-[10px] sm:text-sm font-semibold leading-tight">
                            offer
                        </span>
                    </div>

                    {/* Top Content Area */}
                    <div className="relative z-10 flex flex-col items-start pr-16 sm:pr-20">
                        <span className="bg-brand-primary text-white text-xs font-bold px-3 py-1 rounded mb-3.5 inline-block">
                            New
                        </span>

                        <h2 className="text-text-primary text-lg sm:text-xl font-bold uppercase leading-snug mb-2.5">
                            CLOUD CAM, SECURITY CAMERA
                        </h2>

                        {/* Discount Badge */}
                        <div className="flex items-baseline text-brand-primary mb-5">
                            <span className="flex flex-col text-[10px] font-bold uppercase leading-none mr-1.5 self-center">
                                <span>Up</span>
                                <span>To</span>
                            </span>
                            <span className="text-3xl sm:text-4xl font-black leading-none">
                                70
                            </span>
                            <span className="text-sm font-bold ml-0.5">%</span>
                        </div>

                        {/* Outlined Pill Action */}
                        <Link
                            href="/shop"
                            className="inline-flex items-center gap-2 border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white text-xs sm:text-[13px] font-bold uppercase px-5 py-2 rounded-full transition-all duration-200 group bg-bg-surface"
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

                    {/* Product Phones Graphic */}
                    <div className="relative z-10 mt-4 w-full flex justify-center items-end">
                        <div className="relative w-47.5 h-52.5 sm:w-55 sm:h-60">
                            <Image
                                src="/images/img_57 1.png"
                                alt="Smartphone Device Offer"
                                fill
                                sizes="(max-width: 640px) 190px, 220px"
                                className="object-contain"
                            />
                        </div>
                    </div>
                </aside>
            </div>
        </section>
    );
}
