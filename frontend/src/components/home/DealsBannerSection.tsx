import React from "react";
import Image from "next/image";
import Link from "next/link";

interface DealCardItem {
    id: number;
    titleTop: string;
    titleBottom: string;
    discount: string;
    image: string;
    alt: string;
    link: string;
}

const dealsData: DealCardItem[] = [
    {
        id: 1,
        titleTop: "BREAK DISC",
        titleBottom: "DEALS ON THIS",
        discount: "70",
        image: "/images/products_group (1).jpg",
        alt: "Convertible Laptop Deal",
        link: "/shop?category=laptops",
    },
    {
        id: 2,
        titleTop: "BREAK DISC",
        titleBottom: "DEALS ON THIS",
        discount: "70",
        image: "/images/top_products (2).png",
        alt: "Headphones and Smartphone Deal",
        link: "/shop?category=audio",
    },
    {
        id: 3,
        titleTop: "BREAK DISC",
        titleBottom: "DEALS ON THIS",
        discount: "70",
        image: "/images/top_products (3).png",
        alt: "Tablet Device Deal",
        link: "/shop?category=tablets",
    },
    {
        id: 4,
        titleTop: "BREAK DISC",
        titleBottom: "DEALS ON THIS",
        discount: "70",
        image: "/images/top_products (4).png",
        alt: "Curved Smart TV Deal",
        link: "/shop?category=televisions",
    },
];

export default function DealsBannerSection() {
    return (
        <section
            aria-label="Promotional Deals"
            className="w-full py-6 bg-bg-base transition-colors duration-200"
        >
            <div className="container mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                    {dealsData.map((item) => (
                        <article
                            key={item.id}
                            className="relative overflow-hidden rounded-xl bg-bg-surface border border-border-default p-3.5 sm:p-4 flex items-center justify-between min-h-32 sm:min-h-35 transition-all duration-200 hover:shadow-md hover:border-brand-primary group"
                        >
                            {/* Product Visual */}
                            <div className="relative w-26.25 h-23.75 sm:w-28.75 sm:h-25 shrink-0 flex items-center justify-center">
                                <Image
                                    src={item.image}
                                    alt={item.alt}
                                    fill
                                    sizes="(max-width: 640px) 105px, 115px"
                                    className="object-contain transition-transform duration-300 group-hover:scale-105"
                                />
                            </div>

                            {/* Offer Details */}
                            <div className="flex flex-col items-start pl-2">
                                <h3 className="text-text-primary text-[13px] sm:text-[14px] font-bold tracking-tight uppercase leading-[1.2]">
                                    <span>{item.titleTop}</span>
                                    <br />
                                    <span>{item.titleBottom}</span>
                                </h3>

                                {/* Discount Counter */}
                                <div className="flex items-baseline my-1">
                                    <span className="flex flex-col text-[9px] font-bold uppercase leading-none text-brand-primary mr-1 self-center">
                                        <span>Up</span>
                                        <span>To</span>
                                    </span>
                                    <span className="text-[28px] sm:text-[32px] font-black leading-none text-brand-primary">
                                        {item.discount}
                                    </span>
                                    <span className="text-[13px] font-bold text-brand-primary ml-0.5">
                                        %
                                    </span>
                                </div>

                                {/* Action Link */}
                                <Link
                                    href={item.link}
                                    className="inline-flex items-center gap-1.5 text-text-primary text-[12px] sm:text-[13px] font-medium transition-colors group-hover:text-brand-primary"
                                >
                                    <span>Shop Now</span>
                                    <span className="w-4 h-4 rounded-full bg-brand-primary text-white flex items-center justify-center text-[9px] leading-none shrink-0 transition-transform duration-200 group-hover:translate-x-0.5">
                                        &#10148;
                                    </span>
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
