import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function LaptopRepairBanner() {
    return (
        <section
            aria-label="Laptop Repair Expert Service Promotion"
            className="w-full py-6 bg-bg-base transition-colors duration-200"
        >
            <div className="container mx-auto">
                <div className="relative w-full overflow-hidden rounded-xl bg-[#111315] border border-border-default min-h-70 sm:min-h-75 md:min-h-82.5 flex items-center justify-between gap-3 px-5 py-7 sm:px-10 lg:px-14 shadow-sm">
                    {/* Diagonal Dark Background Graphic */}
                    <div className="absolute inset-0 pointer-events-none z-0">
                        <Image
                            src="/images/ad_promation_bg_bottom.jpg"
                            alt=""
                            fill
                            sizes="(max-width: 1280px) 100vw, 1280px"
                            priority
                            className="object-cover object-center"
                            aria-hidden="true"
                        />
                    </div>

                    {/* 30% Offer Scalloped Rosette Badge */}
                    <div
                        className="absolute top-5 right-4 sm:top-8 sm:right-auto sm:left-[41%] lg:left-[43%] w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-brand-primary text-white flex flex-col items-center justify-center text-center shadow-lg z-20"
                        aria-label="30 percent offer"
                    >
                        <span className="text-[13px] sm:text-[15px] font-black leading-none tracking-tight">
                            30%
                        </span>
                        <span className="text-[10px] sm:text-[11px] font-semibold leading-tight">
                            offer
                        </span>
                    </div>

                    {/* Content Area */}
                    <div className="relative z-10 flex flex-col items-start max-w-[55%] sm:max-w-md lg:max-w-lg">
                        {/* Tag Badge */}
                        <span className="bg-brand-primary text-white text-xs font-semibold px-3 py-1 rounded mb-3 inline-block">
                            Expert Mechanic
                        </span>

                        {/* Headline */}
                        <h2 className="text-white text-xl sm:text-3xl lg:text-[34px] font-bold uppercase leading-[1.2] tracking-tight mb-3">
                            <span>Repair Laptop Perfectly</span>
                            <br />
                            <span>From Expertist</span>
                        </h2>

                        {/* Subtext */}
                        <p className="text-neutral-400 text-xs sm:text-sm font-normal mb-6">
                            Sumptuous, filling, and temptingly
                        </p>

                        {/* CTA Action */}
                        <Link
                            href="/contact?service=laptop-repair"
                            className="inline-flex items-center gap-2 text-white hover:text-brand-primary text-xs sm:text-[13px] font-bold uppercase tracking-wider transition-colors group"
                        >
                            <span>MAKE ENQUIRY</span>
                            <span
                                aria-hidden="true"
                                className="transition-transform group-hover:translate-x-1"
                            >
                                &rarr;
                            </span>
                        </Link>
                    </div>

                    {/* Overlapping Laptop Fan Imagery */}
                    <div className="relative z-10 w-36 h-32 sm:w-90 sm:h-67.5 lg:w-120 lg:h-77.5 shrink-0 flex items-center justify-center">
                        <Image
                            src="/images/ad_promation_product_imagesjpg.png"
                            alt="Multiple convertible laptop displays and hardware repair"
                            fill
                            sizes="(max-width: 640px) 144px, (max-width: 1024px) 360px, 480px"
                            className="object-contain drop-shadow-2xl"
                            priority
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
