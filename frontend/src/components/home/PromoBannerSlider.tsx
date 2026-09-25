"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import type { PromoSliderContent } from "@/lib/homeBlockDefaults";
import { DEFAULT_PROMO_SLIDER } from "@/lib/homeBlockDefaults";

export default function PromoBannerSlider({
  content = DEFAULT_PROMO_SLIDER,
}: {
  content?: PromoSliderContent;
}) {
  const slides =
    content.slides?.length > 0 ? content.slides : DEFAULT_PROMO_SLIDER.slides;
  const bgImage = content.bg_image || DEFAULT_PROMO_SLIDER.bg_image;
  const autoplayMs = content.autoplay_ms || DEFAULT_PROMO_SLIDER.autoplay_ms;

  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || slides.length < 2) return;
    const interval = setInterval(() => {
      setDirection("up");
      setCurrent((prev) => (prev + 1) % slides.length);
    }, autoplayMs);
    return () => clearInterval(interval);
  }, [isPaused, slides.length, autoplayMs]);

  const goToSlide = (index: number) => {
    setDirection(index > current ? "up" : "down");
    setCurrent(index);
  };

  const slideVariants: Variants = {
    initial: (dir: "up" | "down") => ({
      y: dir === "up" ? 80 : -80,
      opacity: 0,
    }),
    animate: {
      y: 0,
      opacity: 1,
      transition: {
        y: { type: "spring", stiffness: 220, damping: 24 },
        opacity: { duration: 0.35 },
      },
    },
    exit: (dir: "up" | "down") => ({
      y: dir === "up" ? -80 : 80,
      opacity: 0,
      transition: { duration: 0.3, ease: "easeInOut" },
    }),
  };

  const slide = slides[current] ?? slides[0];
  if (!slide) return null;

  return (
    <section
      aria-label="Promotional Showcase Banner"
      className="w-full py-6 bg-bg-base transition-colors duration-200"
    >
      <div className="container mx-auto">
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="relative flex w-full min-h-77.5 items-center justify-between overflow-hidden rounded-2xl border border-border-default bg-bg-surface bg-cover bg-center p-6 pr-10 shadow-xs sm:p-10 sm:pr-12 md:min-h-85 lg:p-12 dark:bg-none dark:bg-blend-luminosity"
          style={{ backgroundImage: `url('${bgImage}')` }}
        >
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={current}
              custom={direction}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="relative z-10 w-full flex flex-col-reverse md:flex-row items-center justify-between gap-6"
            >
              <div className="relative w-60 h-47.5 sm:w-80 sm:h-60 lg:w-95 lg:h-67.5 shrink-0 flex items-center justify-center">
                <Image
                  src={slide.image}
                  alt={slide.image_alt}
                  fill
                  sizes="(max-width: 768px) 240px, 380px"
                  className="object-contain drop-shadow-xl"
                  priority
                />
              </div>

              <div className="flex flex-col items-start max-w-lg md:pl-6 w-full">
                <div className="flex items-center gap-6 sm:gap-10 mb-4">
                  <div>
                    <span className="text-[20px] sm:text-[24px] font-bold text-brand-primary leading-none block">
                      {slide.price}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-text-secondary uppercase">
                      {slide.tagline}
                    </span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-[34px] sm:text-[44px] font-black text-brand-primary leading-none mr-2">
                      {slide.highlight_text}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[9px] sm:text-[10px] font-bold tracking-tight text-text-primary uppercase leading-tight">
                        {slide.sub_highlight}
                      </span>
                      <span className="text-[13px] sm:text-[15px] font-bold text-text-primary leading-tight">
                        {slide.category_tag}
                      </span>
                    </div>
                  </div>
                </div>

                <h2 className="text-text-primary text-2xl sm:text-3xl lg:text-[34px] font-bold leading-[1.2] tracking-tight mb-5">
                  <span>{slide.title_line1}</span>
                  <br />
                  <span>{slide.title_line2}</span>
                </h2>

                <Link
                  href={slide.cta_href || "/shop"}
                  className="inline-flex items-center gap-2.5 bg-black dark:bg-white text-white dark:text-black hover:bg-brand-primary dark:hover:bg-brand-primary dark:hover:text-white text-xs sm:text-[13px] font-bold tracking-wider uppercase px-7 py-3 rounded-full transition-all duration-200 group shadow-sm"
                >
                  <span>{slide.cta_label}</span>
                  <span
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-1"
                  >
                    &rarr;
                  </span>
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>

          <div
            className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20"
            role="tablist"
            aria-label="Slide Selector"
          >
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => goToSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`w-2.5 transition-all duration-300 rounded-full cursor-pointer ${
                  current === idx
                    ? "h-6 bg-brand-primary"
                    : "h-2.5 bg-border-default hover:bg-text-secondary"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
