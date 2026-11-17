import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  DEFAULT_DEALS_OF_DAY,
  type DealsOfDayContent,
} from "@/lib/homeBlockDefaults";

export default function DealsLeftPromo({
  content = DEFAULT_DEALS_OF_DAY,
}: {
  content?: DealsOfDayContent;
}) {
  const badge = content.left_badge || DEFAULT_DEALS_OF_DAY.left_badge;
  const headline = content.left_headline || DEFAULT_DEALS_OF_DAY.left_headline;
  const ctaLabel = content.left_cta_label || DEFAULT_DEALS_OF_DAY.left_cta_label;
  const ctaHref = content.left_cta_href || DEFAULT_DEALS_OF_DAY.left_cta_href;
  const image = content.left_image || DEFAULT_DEALS_OF_DAY.left_image;
  const bg = content.left_bg || DEFAULT_DEALS_OF_DAY.left_bg;

  return (
    <article className="relative w-full h-full min-h-115 rounded-xl overflow-hidden border border-border-default flex flex-col justify-between p-6 sm:p-7 shadow-xs bg-bg-surface">
      <div className="absolute inset-0 pointer-events-none z-0">
        <Image
          src={bg}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 25vw"
          className="object-cover opacity-90 dark:opacity-30"
          aria-hidden="true"
          quality={90}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <span className="text-brand-primary text-[13px] sm:text-sm font-bold tracking-wider uppercase mb-1.5">
          {badge}
        </span>

        <h3 className="text-text-primary text-4.75 sm:text-5.25 font-extrabold leading-tight tracking-tight mb-5 max-w-52.5">
          {headline}
        </h3>

        <Link
          href={ctaHref}
          className="inline-flex items-center gap-2 bg-brand-primary hover:bg-brand-hover text-white text-3.25 font-bold uppercase tracking-wider px-6 py-2.5 rounded-full transition-all duration-200 group shadow-xs"
        >
          <span>{ctaLabel}</span>
          <span
            aria-hidden="true"
            className="transition-transform group-hover:translate-x-1"
          >
            &rarr;
          </span>
        </Link>
      </div>

      <div className="relative z-10 w-full h-55 sm:h-60 flex items-center justify-center mt-4">
        <Image
          src={image}
          alt={headline}
          fill
          sizes="(max-width: 1024px) 80vw, 260px"
          className="object-contain drop-shadow-xl"
          priority
          quality={92}
        />
      </div>
    </article>
  );
}
