"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/money";
import {
  DEFAULT_DEALS_OF_DAY,
  type DealsOfDayCenterSlide,
  type DealsOfDayContent,
} from "@/lib/homeBlockDefaults";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const formatUnit = (num: number) => String(Math.max(0, num)).padStart(2, "0");

function DealCountdown({ endsAt }: { endsAt: string }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    mins: 0,
    secs: 0,
  });

  useEffect(() => {
    const tick = () => {
      const end = Date.parse(endsAt);
      const fallback = Date.now() + 11 * 24 * 60 * 60 * 1000;
      const target = Number.isFinite(end) && end > Date.now() ? end : fallback;
      const diff = Math.max(0, target - Date.now());
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      const hours = Math.floor((diff / (60 * 60 * 1000)) % 24);
      const mins = Math.floor((diff / (60 * 1000)) % 60);
      const secs = Math.floor((diff / 1000) % 60);
      setTimeLeft({ days, hours, mins, secs });
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {[
        { label: "Days", value: formatUnit(timeLeft.days) },
        { label: "Hours", value: formatUnit(timeLeft.hours) },
        { label: "Mins", value: formatUnit(timeLeft.mins) },
        { label: "Sec", value: formatUnit(timeLeft.secs) },
      ].map((unit) => (
        <div key={unit.label} className="flex flex-col items-center">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-border-default/80 flex items-center justify-center bg-bg-base text-text-primary font-bold text-sm shadow-2xs">
            {unit.value}
          </div>
          <span className="text-[11px] text-text-secondary mt-1 font-medium">
            {unit.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function DealsCenterProduct({
  content = DEFAULT_DEALS_OF_DAY,
}: {
  content?: DealsOfDayContent;
}) {
  const slides: DealsOfDayCenterSlide[] =
    content.center_slides?.length
      ? content.center_slides
      : DEFAULT_DEALS_OF_DAY.center_slides;
  const dwell = Math.max(2000, content.autoplay_ms || 4500);
  const endsAt = content.deal_ends_at || DEFAULT_DEALS_OF_DAY.deal_ends_at;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const skipFirst = useRef(true);

  const index = currentIndex % slides.length;
  const active = slides[index] ?? slides[0];

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
      return;
    }
    stage.getAnimations().forEach((a) => a.cancel());
    if (prefersReducedMotion()) return;

    stage.animate(
      [
        {
          opacity: 0,
          transform: `translate3d(${dir > 0 ? 20 : -20}px, 8px, 0)`,
        },
        { opacity: 1, transform: "translate3d(0, 0, 0)" },
      ],
      { duration: 400, easing: EASE, fill: "both" },
    );

    stage.querySelectorAll<HTMLElement>("[data-deal-center]").forEach((el, i) => {
      el.getAnimations().forEach((a) => a.cancel());
      el.animate(
        [
          {
            opacity: 0,
            transform:
              i === 0
                ? `translate3d(${dir > 0 ? -14 : 14}px, 0, 0)`
                : `scale(0.94) translate3d(${dir > 0 ? 16 : -16}px, 0, 0)`,
          },
          { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
        ],
        {
          duration: 420,
          delay: 40 + i * 60,
          easing: EASE,
          fill: "both",
        },
      );
    });
  }, [index, dir]);

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
      <div
        ref={stageRef}
        className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center min-h-67.5 will-change-transform"
      >
        <div
          data-deal-center
          className="md:col-span-6 flex flex-col items-start"
        >
          <div
            className="flex items-center gap-1 mb-2.5"
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

          <div className="flex items-center gap-2 mb-2">
            <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5">
              <span className="bg-[#F25022] rounded-[1px]" />
              <span className="bg-[#7FBA00] rounded-[1px]" />
              <span className="bg-[#00A4EF] rounded-[1px]" />
              <span className="bg-[#FFB900] rounded-[1px]" />
            </div>
            <span className="text-text-secondary text-xs font-semibold">
              {active.brand}
            </span>
          </div>

          <h3 className="text-text-primary text-xl sm:text-2xl font-bold tracking-tight mb-1">
            <Link
              href={active.href || "/shop"}
              className="hover:text-brand-primary transition-colors"
            >
              {active.title}
            </Link>
          </h3>
          <p className="text-text-secondary text-[13px] font-normal mb-3">
            {active.subtitle}
          </p>

          <div className="flex items-center gap-2.5 mb-4">
            <span className="text-text-primary text-lg font-bold">
              {formatPrice(active.price)}
            </span>
            <span className="text-text-secondary line-through text-sm">
              {formatPrice(active.original_price)}
            </span>
            <span className="bg-brand-primary text-white text-[11px] font-bold px-1.5 py-0.5 rounded-sm">
              -{active.discount_percent}%
            </span>
          </div>

          <span className="text-text-primary text-xs font-bold uppercase tracking-wider mb-2.5 block">
            Deals End To:
          </span>
          <DealCountdown endsAt={endsAt} />
        </div>

        <div
          data-deal-center
          className="md:col-span-6 relative w-full h-57.5 sm:h-65 flex items-center justify-center overflow-hidden"
        >
          <Image
            src={active.main_image}
            alt={active.alt}
            fill
            sizes="(max-width: 768px) 100vw, 420px"
            className="object-contain"
            priority
            quality={92}
          />
        </div>
      </div>

      <div
        className="grid grid-cols-4 gap-3 pt-5 mt-4 border-t border-border-default/60"
        role="tablist"
        aria-label="Center deal products"
      >
        {slides.map((prod, idx) => {
          const isSelected = index === idx;
          return (
            <button
              key={`${prod.title}-${idx}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => select(idx)}
              className={`relative w-full h-16.25 sm:h-18.75 rounded-lg border p-1.5 flex items-center justify-center bg-bg-subtle transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "border-brand-primary ring-2 ring-brand-primary/30 shadow-xs scale-[1.02]"
                  : "border-border-default/60 hover:border-text-secondary opacity-70 hover:opacity-100 hover:scale-[1.02]"
              }`}
            >
              <Image
                src={prod.thumb_image}
                alt={prod.alt}
                fill
                sizes="96px"
                className="object-contain p-1"
                quality={90}
              />
            </button>
          );
        })}
      </div>
    </article>
  );
}
