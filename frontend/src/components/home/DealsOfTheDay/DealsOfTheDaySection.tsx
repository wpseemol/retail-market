import React from "react";
import {
  DEFAULT_DEALS_OF_DAY,
  type DealsOfDayContent,
} from "@/lib/homeBlockDefaults";
import DealsLeftPromo from "./DealsLeftPromo";
import DealsCenterProduct from "./DealsCenterProduct";
import DealsRightProduct from "./DealsRightProduct";

export default function DealsOfTheDaySection({
  content = DEFAULT_DEALS_OF_DAY,
}: {
  content?: DealsOfDayContent;
} = {}) {
  const merged: DealsOfDayContent = {
    ...DEFAULT_DEALS_OF_DAY,
    ...content,
    center_slides:
      content.center_slides?.length
        ? content.center_slides
        : DEFAULT_DEALS_OF_DAY.center_slides,
    right_slides:
      content.right_slides?.length
        ? content.right_slides
        : DEFAULT_DEALS_OF_DAY.right_slides,
  };
  const title = merged.title || DEFAULT_DEALS_OF_DAY.title;

  return (
    <section
      aria-label="Deals of the Day Section"
      className="w-full py-8 bg-bg-base transition-colors duration-200"
    >
      <div className="container mx-auto">
        <div className="relative pb-2 mb-5 border-b border-border-default/60">
          <h2 className="text-text-primary text-xl sm:text-2xl font-bold tracking-tight pb-2">
            {title}
          </h2>
          <span className="absolute bottom-0 left-0 w-7 h-0.5 bg-brand-primary" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          <div className="md:col-span-12 lg:col-span-3 w-full h-full">
            <DealsLeftPromo content={merged} />
          </div>

          <div className="md:col-span-12 lg:col-span-6 w-full h-full">
            <DealsCenterProduct content={merged} />
          </div>

          <div className="md:col-span-12 lg:col-span-3 w-full h-full">
            <DealsRightProduct content={merged} />
          </div>
        </div>
      </div>
    </section>
  );
}
