"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PromoSliderContent } from "@/lib/homeBlockDefaults";
import { DEFAULT_PROMO_SLIDER } from "@/lib/homeBlockDefaults";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const EXIT_MS = 320;
const ENTER_MS = 560;

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function settle(anim: Animation | undefined, ms: number) {
  if (!anim) return Promise.resolve();
  return Promise.race([
    anim.finished.then(() => undefined, () => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, ms + 80)),
  ]);
}

/**
 * Home promo product slider.
 * Uses the Web Animations API (site disables CSS keyframes + framer-motion globally).
 */
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
  const [shown, setShown] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isPaused, setIsPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);

  const stageRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLDivElement>(null);
  const floatAnimRef = useRef<Animation | null>(null);
  const swapping = useRef(false);

  const slide = slides[shown] ?? slides[0];

  // Autoplay
  useEffect(() => {
    if (isPaused || slides.length < 2 || prefersReducedMotion()) return;
    const interval = setInterval(() => {
      setDirection(1);
      setCurrent((prev) => (prev + 1) % slides.length);
    }, autoplayMs);
    return () => clearInterval(interval);
  }, [isPaused, slides.length, autoplayMs, progressKey]);

  // Exit → swap → enter (WAAPI)
  useEffect(() => {
    if (current === shown) return;
    const stage = stageRef.current;
    if (!stage) return;

    let cancelled = false;
    swapping.current = true;
    const dir = direction;
    const reduce = prefersReducedMotion();

    const run = async () => {
      stage.getAnimations().forEach((a) => a.cancel());
      if (!reduce) {
        const exit = stage.animate(
          [
            { opacity: 1, transform: "translate3d(0, 0, 0)" },
            {
              opacity: 0,
              transform: `translate3d(0, ${dir > 0 ? -28 : 28}px, 0)`,
            },
          ],
          {
            duration: EXIT_MS,
            easing: "cubic-bezier(0.4, 0, 1, 1)",
            fill: "forwards",
          },
        );
        await settle(exit, EXIT_MS);
      }
      if (cancelled) {
        swapping.current = false;
        return;
      }
      setShown(current);
      setProgressKey((k) => k + 1);
    };

    void run();
    return () => {
      cancelled = true;
      swapping.current = false;
    };
  }, [current, shown, direction]);

  // Enter + product float after swap
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const product = productRef.current;
    floatAnimRef.current?.cancel();
    floatAnimRef.current = null;

    if (!stage) {
      swapping.current = false;
      return;
    }

    stage.getAnimations().forEach((a) => a.cancel());
    const reduce = prefersReducedMotion();

    if (reduce) {
      stage.style.opacity = "1";
      stage.style.transform = "none";
      swapping.current = false;
      return;
    }

    const dir = direction;
    stage.animate(
      [
        {
          opacity: 0,
          transform: `translate3d(0, ${dir > 0 ? 36 : -36}px, 0)`,
        },
        { opacity: 1, transform: "translate3d(0, 0, 0)" },
      ],
      { duration: ENTER_MS, easing: EASE, fill: "both" },
    );

    // Stagger copy + CTA
    stage.querySelectorAll<HTMLElement>("[data-promo-part]").forEach((el, i) => {
      el.getAnimations().forEach((a) => a.cancel());
      el.animate(
        [
          { opacity: 0, transform: "translate3d(18px, 0, 0)" },
          { opacity: 1, transform: "translate3d(0, 0, 0)" },
        ],
        {
          duration: 480,
          delay: 90 + i * 70,
          easing: EASE,
          fill: "both",
        },
      );
    });

    // Product: rise + soft scale, then idle float
    if (product) {
      product.getAnimations().forEach((a) => a.cancel());
      const enter = product.animate(
        [
          {
            opacity: 0,
            transform: `translate3d(${dir > 0 ? -24 : 24}px, 28px, 0) scale(0.92)`,
          },
          { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
        ],
        { duration: 640, delay: 40, easing: EASE, fill: "both" },
      );

      void settle(enter, 700).then(() => {
        if (!product.isConnected || prefersReducedMotion()) return;
        floatAnimRef.current = product.animate(
          [
            { transform: "translate3d(0, 0, 0)" },
            { transform: "translate3d(0, -7px, 0)" },
            { transform: "translate3d(0, 0, 0)" },
          ],
          {
            duration: 3200,
            iterations: Infinity,
            easing: "ease-in-out",
          },
        );
      });
    }

    swapping.current = false;
  }, [shown, direction]);

  const goToSlide = (index: number) => {
    if (index === current || swapping.current) return;
    setDirection(index > current ? 1 : -1);
    setCurrent(index);
  };

  if (!slide) return null;

  return (
    <section
      aria-label="Promotional Showcase Banner"
      className="w-full bg-bg-base py-6"
    >
      <div className="container mx-auto">
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="relative flex min-h-77.5 w-full items-center justify-between overflow-hidden rounded-2xl border border-border-default bg-bg-surface p-6 pr-10 shadow-xs sm:min-h-85 sm:p-10 sm:pr-12 lg:p-12"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-cover bg-center dark:mix-blend-screen dark:[filter:invert(1)_hue-rotate(180deg)_saturate(1.6)_brightness(1.8)]"
            style={{ backgroundImage: `url('${bgImage}')` }}
          />

          {/* Soft ambient glow under product */}
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-[18%] left-[8%] z-[1] h-16 w-48 rounded-[100%] bg-brand-primary/15 blur-2xl sm:left-[12%] sm:w-64"
          />

          <div
            ref={stageRef}
            className="relative z-10 flex w-full flex-col-reverse items-center justify-between gap-6 md:flex-row"
          >
            <div
              ref={productRef}
              className="relative flex h-47.5 w-60 shrink-0 items-center justify-center sm:h-60 sm:w-80 lg:h-67.5 lg:w-95"
            >
              <Image
                src={slide.image}
                alt={slide.image_alt}
                fill
                sizes="(max-width: 768px) 240px, 380px"
                className="object-contain drop-shadow-xl"
                priority={shown === 0}
              />
            </div>

            <div className="flex w-full max-w-lg flex-col items-start md:pl-6">
              <div
                data-promo-part
                className="mb-4 flex items-center gap-6 sm:gap-10"
              >
                <div>
                  <span className="block text-xl leading-none font-bold text-brand-primary sm:text-2xl">
                    {slide.price}
                  </span>
                  <span className="text-2.5 sm:text-[11px] font-semibold tracking-wider text-text-secondary uppercase">
                    {slide.tagline}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="mr-2 text-8.5 sm:text-11 leading-none font-black text-brand-primary">
                    {slide.highlight_text}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[9px] sm:text-2.5 leading-tight font-bold tracking-tight text-text-primary uppercase">
                      {slide.sub_highlight}
                    </span>
                    <span className="text-[13px] sm:text-[15px] leading-tight font-bold text-text-primary">
                      {slide.category_tag}
                    </span>
                  </div>
                </div>
              </div>

              <h2
                data-promo-part
                className="mb-5 text-2xl leading-[1.2] font-bold tracking-tight text-text-primary sm:text-3xl lg:text-8.5"
              >
                <span>{slide.title_line1}</span>
                <br />
                <span>{slide.title_line2}</span>
              </h2>

              <Link
                data-promo-part
                href={slide.cta_href || "/shop"}
                className="group inline-flex items-center gap-2.5 rounded-full bg-black px-7 py-3 text-xs font-bold tracking-wider text-white uppercase shadow-sm transition-all duration-200 hover:bg-brand-primary sm:text-[13px] dark:bg-white dark:text-black dark:hover:bg-brand-primary dark:hover:text-white"
              >
                <span>{slide.cta_label}</span>
                <span
                  aria-hidden="true"
                  className="transition-transform duration-200 group-hover:translate-x-1"
                >
                  &rarr;
                </span>
              </Link>
            </div>
          </div>

          <div
            className="absolute top-1/2 right-4 z-20 flex -translate-y-1/2 flex-col gap-2.5 sm:right-6"
            role="tablist"
            aria-label="Slide Selector"
          >
            {slides.map((_, idx) => {
              const active = shown === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => goToSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  aria-selected={active}
                  className={`relative cursor-pointer overflow-hidden rounded-full transition-all duration-300 ${
                    active
                      ? "h-7 w-2.5 bg-border-default/80"
                      : "h-2.5 w-2.5 bg-border-default hover:bg-text-secondary"
                  }`}
                >
                  {active ? (
                    slides.length > 1 ? (
                      <span
                        key={progressKey}
                        data-promo-progress
                        className={isPaused ? "is-paused" : undefined}
                        style={
                          {
                            "--promo-autoplay": `${autoplayMs}ms`,
                          } as React.CSSProperties
                        }
                      />
                    ) : (
                      <span className="absolute inset-0 rounded-full bg-brand-primary" />
                    )
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
