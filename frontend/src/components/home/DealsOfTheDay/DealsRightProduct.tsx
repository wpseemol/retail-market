"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/money";
import {
  DEFAULT_DEALS_OF_DAY,
  type DealsOfDayContent,
  type DealsOfDayRightSlide,
} from "@/lib/homeBlockDefaults";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function DealsRightProduct({
  content = DEFAULT_DEALS_OF_DAY,
}: {
  content?: DealsOfDayContent;
}) {
  const slides: DealsOfDayRightSlide[] =
    content.right_slides?.length
      ? content.right_slides
      : DEFAULT_DEALS_OF_DAY.right_slides;
  const dwell = Math.max(2000, (content.autoplay_ms || 4500) + 400);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const skipFirst = useRef(true);

  const index = currentIndex % slides.length;
  const active = slides[index] ?? slides[0];
  const progressPercent = Math.min(
    100,
    Math.round(
      (active.sold_out / Math.max(1, active.available + active.sold_out)) * 100,
    ),
  );

  useEffect(() => {
    if (paused || prefersReducedMotion() || slides.length < 2) return;
    const id = window.setInterval(() => {
      setDir(1);
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, dwell);
    return () => window.clearInterval(id);
  }, [paused, dwell, slides.length, currentIndex]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (skipFirst.current) {
      skipFirst.current = false;
      const bar = barRef.current;
      if (bar) bar.style.width = `${progressPercent}%`;
      return;
    }
    stage.getAnimations().forEach((a) => a.cancel());
    if (!prefersReducedMotion()) {
      stage.animate(
        [
          {
            opacity: 0,
            transform: `translate3d(0, ${dir > 0 ? 12 : -12}px, 0)`,
          },
          { opacity: 1, transform: "translate3d(0, 0, 0)" },
        ],
        { duration: 380, easing: EASE, fill: "both" },
      );
      stage.querySelectorAll<HTMLElement>("[data-deal-right]").forEach((el, i) => {
        el.getAnimations().forEach((a) => a.cancel());
        el.animate(
          [
            {
              opacity: 0,
              transform:
                i === 0
                  ? `scale(0.94) translate3d(${dir > 0 ? 12 : -12}px, 0, 0)`
                  : `translate3d(0, ${dir > 0 ? 10 : -10}px, 0)`,
            },
            { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
          ],
          {
            duration: 400,
            delay: 30 + i * 50,
            easing: EASE,
            fill: "both",
          },
        );
      });
    }

    const bar = barRef.current;
    if (bar) {
      bar.getAnimations().forEach((a) => a.cancel());
      if (prefersReducedMotion()) {
        bar.style.width = `${progressPercent}%`;
      } else {
        bar.animate(
          [{ width: "0%" }, { width: `${progressPercent}%` }],
          { duration: 520, easing: EASE, fill: "forwards" },
        );
      }
    }
  }, [index, dir, progressPercent]);

  const select = (idx: number) => {
    if (idx === index) return;
    setDir(idx > index ? 1 : -1);
    setCurrentIndex(idx);
  };

  return (
    <article
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false);
      }}
      className="w-full h-full rounded-xl bg-bg-surface border border-border-default p-5 sm:p-6 flex flex-col justify-between shadow-xs transition-colors duration-200 overflow-hidden"
    >
      <div ref={stageRef} className="flex flex-col will-change-transform">
        <div
          data-deal-right
          className="relative w-full h-50 sm:h-55 flex items-center justify-center overflow-hidden"
        >
          <Image
            src={active.main_image}
            alt={active.alt}
            fill
            sizes="(max-width: 1024px) 100vw, 320px"
            className="object-contain"
            priority
            quality={92}
          />
        </div>

        <div
          className="grid grid-cols-4 gap-2.5 my-3.5"
          role="tablist"
          aria-label="Flash deal products"
        >
          {slides.map((item, idx) => {
            const isSelected = index === idx;
            return (
              <button
                key={`${item.name}-${idx}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => select(idx)}
                className={`relative w-full h-12 sm:h-14 rounded-lg border p-1 flex items-center justify-center bg-bg-subtle transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "border-brand-primary ring-2 ring-brand-primary/30 scale-[1.03]"
                    : "border-border-default/60 hover:border-text-secondary opacity-70 hover:opacity-100 hover:scale-[1.02]"
                }`}
              >
                <Image
                  src={item.thumb_image}
                  alt={item.alt}
                  fill
                  sizes="72px"
                  className="object-contain p-0.5"
                  quality={90}
                />
              </button>
            );
          })}
        </div>

        <div data-deal-right className="w-full my-2">
          <div className="flex items-center justify-between text-xs sm:text-[13px] font-medium text-text-secondary mb-1.5">
            <span>
              Available:{" "}
              <strong className="text-text-primary font-bold">
                {active.available}
              </strong>
            </span>
            <span>
              Sold Out:{" "}
              <strong className="text-text-primary font-bold">
                {active.sold_out}
              </strong>
            </span>
          </div>

          <div className="w-full h-1.5 bg-border-default/50 rounded-full overflow-hidden">
            <div
              ref={barRef}
              className="h-full bg-brand-primary rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div data-deal-right className="flex flex-col items-start mt-2">
          <div
            className="flex items-center gap-1 mb-1.5"
            aria-label={`${active.rating} out of 5 stars`}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                width="13"
                height="13"
                viewBox="0 0 20 20"
                fill={star <= active.rating ? "#F59E0B" : "none"}
                stroke="#F59E0B"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>

          <h3 className="text-text-primary text-[15px] sm:text-base font-bold leading-snug line-clamp-2 mb-2">
            <Link
              href={active.href || "/shop"}
              className="hover:text-brand-primary transition-colors"
            >
              {active.name}
            </Link>
          </h3>

          <div className="flex items-center gap-2">
            <span className="text-brand-primary text-base sm:text-lg font-bold">
              {formatPrice(active.price)}
            </span>
            <span className="text-text-secondary line-through text-xs sm:text-sm">
              {formatPrice(active.original_price)}
            </span>
            <span className="bg-brand-primary text-white text-2.5 font-bold px-1.5 py-0.5 rounded-sm">
              -{active.discount_percent}%
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
