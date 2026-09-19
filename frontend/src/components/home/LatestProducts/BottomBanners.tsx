import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function BottomBanners() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
            {/* ================= Left Promo: Apple Watch Banner ================= */}
            <article className="relative overflow-hidden rounded-xl border border-border-default min-h-42.5 sm:min-h-47.5 p-6 sm:p-7 flex items-center justify-between group">
                <div className="absolute inset-0 pointer-events-none z-0">
                    <Image
                        src="/images/buttom_left_bg.jpg"
                        alt=""
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover object-center"
                        aria-hidden="true"
                    />
                </div>

                <div className="relative z-10 flex flex-col items-start max-w-65">
                    <span className="text-brand-primary text-xs font-bold uppercase tracking-wider mb-1">
                        GET 30% OFF
                    </span>
                    <h3 className="text-white text-base sm:text-lg font-extrabold uppercase leading-snug tracking-tight mb-1">
                        BUY ONE. GET FREE DELIVERY
                    </h3>
                    <p className="text-text-secondary text-xs sm:text-[13px] font-medium mb-4">
                        Starting{" "}
                        <span className="text-brand-primary font-bold">
                            560.99
                        </span>
                    </p>

                    <Link
                        href="/shop?deals=apple-watch"
                        className="inline-flex items-center gap-2 text-white text-xs font-bold uppercase tracking-wider hover:text-brand-primary transition-colors"
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

                <div className="relative z-10 w-35 h-32.5 sm:w-42.5 sm:h-37.5 shrink-0 flex items-center justify-center">
                    <Image
                        src="/images/bottom_banner_left_product.png"
                        alt="Smart Watches Splash"
                        fill
                        sizes="170px"
                        className="object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                    />
                </div>
            </article>

            {/* ================= Right Promo: Hardware Component Banner ================= */}
            <article className="relative overflow-hidden rounded-xl border border-border-default min-h-42.5 sm:min-h-47.5 p-6 sm:p-7 flex items-center justify-between group">
                <div className="absolute inset-0 pointer-events-none z-0">
                    <Image
                        src="/images/bottom_right_bg.jpg"
                        alt=""
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover object-center"
                        aria-hidden="true"
                    />
                </div>

                {/* 25% Rosette Badge */}
                <div
                    className="absolute right-36.25 sm:right-43.75 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-brand-primary text-white flex flex-col items-center justify-center text-center shadow-md z-20"
                    aria-label="25 percent offer"
                >
                    <span className="text-xs font-black leading-none">25%</span>
                    <span className="text-[10px] font-semibold leading-none">
                        offer
                    </span>
                </div>

                <div className="relative z-10 flex flex-col items-start max-w-65">
                    <span className="text-brand-primary text-xs font-bold uppercase tracking-wider mb-1">
                        GET 30% OFF
                    </span>
                    <h3 className="text-white text-base sm:text-lg font-extrabold uppercase leading-snug tracking-tight mb-1">
                        BUY ONE. GET FREE DELIVERY
                    </h3>
                    <p className="text-text-secondary text-xs sm:text-[13px] font-medium mb-4">
                        Starting{" "}
                        <span className="text-brand-primary font-bold">
                            560.99
                        </span>
                    </p>

                    <Link
                        href="/shop?deals=pc-parts"
                        className="inline-flex items-center gap-2 text-white text-xs font-bold uppercase tracking-wider hover:text-brand-primary transition-colors"
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

                <div className="relative z-10 w-35 h-32.5 sm:w-42.5 sm:h-37.5 shrink-0 flex items-center justify-center">
                    <Image
                        src="/images/buttom_right_product.png"
                        alt="PC Component Cooler"
                        fill
                        sizes="170px"
                        className="object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                    />
                </div>
            </article>
        </div>
    );
}
