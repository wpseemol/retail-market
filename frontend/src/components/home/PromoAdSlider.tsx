"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface AdItem {
    id: number;
    image: string;
    alt: string;
    link: string;
}

const promoAds: AdItem[] = [
    {
        id: 1,
        image: "/images/header_ad.jpg",
        alt: "Autoparts Equipment Special Promotion",
        link: "/shop?category=autoparts",
    },
    {
        id: 2,
        image: "/images/header_ad.jpg", // Replace with second ad image if available
        alt: "Digital Cameras Up to 70% Off",
        link: "/shop?category=cameras",
    },
    {
        id: 3,
        image: "/images/header_ad.jpg", // Replace with third ad image if available
        alt: "Smartphones & Gadgets Weekly Deal",
        link: "/shop?category=smartphones",
    },
];

export default function PromoAdSlider() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (isPaused) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % promoAds.length);
        }, 3500);

        return () => clearInterval(interval);
    }, [isPaused]);

    return (
        <aside
            aria-label="Promotional Announcement Slider"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="hidden xl:flex items-center rounded overflow-hidden h-12.5 w-135 relative mx-2 bg-bg-subtle border border-border-default/40"
        >
            <AnimatePresence mode="popLayout">
                <motion.div
                    key={promoAds[currentIndex].id}
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    transition={{
                        duration: 0.6,
                        ease: [0.16, 1, 0.3, 1], // Cubic-bezier for smooth deceleration
                    }}
                    className="w-full h-full absolute inset-0 flex items-center justify-center"
                >
                    <Link
                        href={promoAds[currentIndex].link}
                        className="relative w-full h-full"
                    >
                        <Image
                            src={promoAds[currentIndex].image}
                            alt={promoAds[currentIndex].alt}
                            fill
                            sizes="540px"
                            className="object-cover"
                            priority
                        />
                    </Link>
                </motion.div>
            </AnimatePresence>
        </aside>
    );
}
