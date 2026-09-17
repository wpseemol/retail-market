import React from "react";
import Image from "next/image";

interface FeatureItem {
    id: number;
    title: string;
    description: string;
    icon: string;
    alt: string;
}

const featureData: FeatureItem[] = [
    {
        id: 1,
        title: "Free Shipping",
        description: "Free shipping on all your order",
        icon: "/icons/featured_delivery-truck 1.svg",
        alt: "Delivery Truck Icon",
    },
    {
        id: 2,
        title: "Customer Support 24/7",
        description: "Instant access to Support",
        icon: "/icons/featured_Group.svg",
        alt: "Headset Support Icon",
    },
    {
        id: 3,
        title: "100% Secure Payment",
        description: "We ensure your money is save",
        icon: "/icons/featured_Group-1.svg",
        alt: "Secure Bag Icon",
    },
    {
        id: 4,
        title: "Money-Back Guarantee",
        description: "30 Days Money-Back Guarantee",
        icon: "/icons/featured_Group-2.svg",
        alt: "Guarantee Package Box Icon",
    },
];

export default function FeaturedSection() {
    return (
        <section
            aria-label="Core Services and Guarantees"
            className="w-full py-6 bg-bg-base transition-colors duration-200"
        >
            <div className="container mx-auto">
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-6 sm:p-8 bg-bg-surface border border-brand-primary rounded-xl shadow-xs list-none m-0">
                    {featureData.map((feature) => (
                        <li
                            key={feature.id}
                            className="flex items-center gap-4 transition-transform duration-200 hover:-translate-y-0.5"
                        >
                            {/* Feature Icon */}
                            <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
                                <Image
                                    src={feature.icon}
                                    alt={feature.alt}
                                    width={40}
                                    height={40}
                                    className="w-10 h-10 object-contain"
                                />
                            </div>

                            {/* Feature Text */}
                            <div className="flex flex-col">
                                <h3 className="text-brand-primary text-[16px] font-bold leading-snug tracking-tight">
                                    {feature.title}
                                </h3>
                                <p className="text-text-secondary text-[13px] font-normal leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
