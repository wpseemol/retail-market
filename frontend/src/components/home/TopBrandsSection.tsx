import React from "react";
import Image from "next/image";
import Link from "next/link";

interface BrandItem {
    id: number;
    name: string;
    link: string;
    isLocalImage?: boolean;
    imageSrc?: string;
    svg?: React.ReactNode;
}

const brandsList: BrandItem[] = [
    {
        id: 1,
        name: "Apple",
        link: "/shop?brand=apple",
        isLocalImage: true,
        imageSrc: "/images/apple.png",
    },
    {
        id: 2,
        name: "Microsoft",
        link: "/shop?brand=microsoft",
        svg: (
            <div className="flex items-center gap-2.5">
                <div className="grid grid-cols-2 gap-1 w-5 h-5 shrink-0">
                    <span className="bg-[#F25022] w-2 h-2" />
                    <span className="bg-[#7FBA00] w-2 h-2" />
                    <span className="bg-[#00A4EF] w-2 h-2" />
                    <span className="bg-[#FFB900] w-2 h-2" />
                </div>
                <span className="text-[20px] font-semibold text-neutral-700 dark:text-neutral-200 tracking-tight font-sans">
                    Microsoft
                </span>
            </div>
        ),
    },
    {
        id: 3,
        name: "HP",
        link: "/shop?brand=hp",
        svg: (
            <svg
                className="h-10 w-10 text-[#0096D6]"
                viewBox="0 0 100 100"
                fill="currentColor"
            >
                <circle
                    cx="50"
                    cy="50"
                    r="48"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                />
                <text
                    x="48"
                    y="62"
                    textAnchor="middle"
                    fontSize="46"
                    fontStyle="italic"
                    fontWeight="bold"
                    fill="currentColor"
                    fontFamily="sans-serif"
                >
                    hp
                </text>
            </svg>
        ),
    },
    {
        id: 4,
        name: "ASUS",
        link: "/shop?brand=asus",
        svg: (
            <span className="text-[24px] font-black tracking-widest text-[#00539B] dark:text-[#388bfd] font-sans">
                ASUS
            </span>
        ),
    },
    {
        id: 5,
        name: "DELL",
        link: "/shop?brand=dell",
        svg: (
            <div className="w-10 h-10 rounded-full border-[3px] border-[#007DB8] flex items-center justify-center">
                <span className="text-[12px] font-extrabold text-[#007DB8] tracking-widest font-sans">
                    DELL
                </span>
            </div>
        ),
    },
    {
        id: 6,
        name: "Lenovo",
        link: "/shop?brand=lenovo",
        svg: (
            <span className="text-[24px] font-bold text-[#E2231A] tracking-tighter font-sans">
                Lenovo
            </span>
        ),
    },
    {
        id: 7,
        name: "Acer",
        link: "/shop?brand=acer",
        svg: (
            <span className="text-[24px] font-bold text-[#83B81A] tracking-tight font-sans lowercase">
                acer
            </span>
        ),
    },
];

export default function TopBrandsSection() {
    return (
        <section
            aria-label="Top Brands Showcase"
            className="w-full py-8 bg-bg-base transition-colors duration-200"
        >
            <div className="container mx-auto">
                {/* Header with Angled Label */}
                <div className="flex items-center justify-between border-b border-black pb-0 mb-6">
                    <div className="relative">
                        {/* Dark Angled Badge */}
                        <div className="relative z-10 bg-black text-white text-sm sm:text-base font-bold uppercase tracking-wider px-6 py-2.5 [clip-path:polygon(0_0,calc(100%-16px)_0,100%_100%,0_100%)] pr-10">
                            Top Brands
                        </div>
                        {/* Underline segment */}
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-black dark:bg-white" />
                    </div>

                    {/* Right Action Link */}
                    <Link
                        href="/brands"
                        className="text-text-secondary hover:text-brand-primary text-xs sm:text-sm font-medium transition-colors"
                    >
                        See All Brands
                    </Link>
                </div>

                {/* Brands Logo Row */}
                <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-6 sm:gap-8 items-center justify-items-center py-4 list-none m-0 p-0">
                    {brandsList.map((brand) => (
                        <li
                            key={brand.id}
                            className="w-full flex items-center justify-center"
                        >
                            <Link
                                href={brand.link}
                                aria-label={`View products by ${brand.name}`}
                                className="group flex items-center justify-center py-2 px-3 transition-transform duration-200 hover:-translate-y-1 focus:outline-none"
                            >
                                {brand.isLocalImage && brand.imageSrc ? (
                                    <div className="relative w-28 h-9 flex items-center justify-center dark:brightness-0 dark:invert transition-all">
                                        <Image
                                            src={brand.imageSrc}
                                            alt={brand.name}
                                            width={110}
                                            height={36}
                                            className="object-contain max-h-8 w-auto"
                                        />
                                    </div>
                                ) : (
                                    <div className="transition-opacity group-hover:opacity-85 flex items-center justify-center">
                                        {brand.svg}
                                    </div>
                                )}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
