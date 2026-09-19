import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function DealsLeftPromo() {
    return (
        <article className="relative w-full h-full min-h-115 rounded-xl overflow-hidden border border-border-default flex flex-col justify-between p-6 sm:p-7 shadow-xs">
            {/* Background Graphic */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <Image
                    src="/images/Deals of The Day_left_bg.jpg"
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 25vw"
                    className="object-cover opacity-90 dark:opacity-20"
                    aria-hidden="true"
                />
            </div>

            {/* Text & Button Area */}
            <div className="relative z-10 flex flex-col items-center text-center">
                <span className="text-brand-primary text-[13px] sm:text-[14px] font-bold tracking-wider uppercase mb-1.5">
                    GET SAVE 30% OFF
                </span>

                <h3 className="text-text-primary text-4.75 sm:text-5.25 font-extrabold leading-tight  tracking-tight mb-5 max-w-52.5">
                    General Motors Buick Sonic Engine
                </h3>

                <Link
                    href="/shop?deals=buick-engine"
                    className="inline-flex items-center gap-2 bg-brand-primary hover:bg-brand-hover text-white text-3.25 font-bold uppercase tracking-wider px-6 py-2.5 rounded-full transition-all duration-200 group shadow-xs"
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

            {/* Action Cam Product Image */}
            <div className="relative z-10 w-full h-55 sm:h-60 flex items-center justify-center mt-4">
                <Image
                    src="/images/Deals of The Day left product image.png"
                    alt="Waterproof Splash Proof 4K Action Camera"
                    fill
                    sizes="(max-width: 1024px) 80vw, 260px"
                    className="object-contain drop-shadow-xl"
                    priority
                />
            </div>
        </article>
    );
}
