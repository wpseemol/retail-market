import React from "react";
import DealsLeftPromo from "./DealsLeftPromo";
import DealsCenterProduct from "./DealsCenterProduct";
import DealsRightProduct from "./DealsRightProduct";

export default function DealsOfTheDaySection() {
    return (
        <section
            aria-label="Deals of the Day Section"
            className="w-full py-8 bg-bg-base transition-colors duration-200"
        >
            <div className="container mx-auto">
                {/* Section Header */}
                <div className="relative pb-2 mb-5 border-b border-border-default/60">
                    <h2 className="text-text-primary text-xl sm:text-2xl font-bold tracking-tight pb-2">
                        Deals of The Day
                    </h2>
                    <span className="absolute bottom-0 left-0 w-28 h-[2px] bg-brand-primary" />
                </div>

                {/* Responsive Grid: 3-column desktop layout matching exact proportions */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                    {/* Left Promo Card: 3 columns */}
                    <div className="md:col-span-12 lg:col-span-3 w-full h-full">
                        <DealsLeftPromo />
                    </div>

                    {/* Center Deal Showcase: 6 columns */}
                    <div className="md:col-span-12 lg:col-span-6 w-full h-full">
                        <DealsCenterProduct />
                    </div>

                    {/* Right Inventory Deal: 3 columns */}
                    <div className="md:col-span-12 lg:col-span-3 w-full h-full">
                        <DealsRightProduct />
                    </div>
                </div>
            </div>
        </section>
    );
}
