"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AnimatePresence,
  LazyMotion,
  domAnimation,
  m,
  useReducedMotion,
} from "framer-motion";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PublicCategory } from "@/lib/categories";
import { categoryShopHref } from "@/lib/categories";

type Props = {
  categories: PublicCategory[];
  /** Compact trigger for the mobile drawer. */
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
};

function resolveCategoryLucideIcon(
  name: string | null | undefined,
): LucideIcon {
  if (name) {
    const candidate = (LucideIcons as Record<string, unknown>)[name];
    if (
      typeof candidate === "function" ||
      (candidate &&
        typeof candidate === "object" &&
        "$$typeof" in (candidate as object))
    ) {
      return candidate as LucideIcon;
    }
  }
  return LucideIcons.FolderTree;
}

/** Prefer uploaded image; otherwise backend Lucide icon key; else FolderTree. */
function CategoryGlyph({ category }: { category: PublicCategory }) {
  const src = category.image?.path;

  if (src) {
    if (/^https?:\/\//i.test(src)) {
      return (
        <span className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-bg-subtle ring-1 ring-border-default/60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        </span>
      );
    }
    return (
      <span className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-bg-subtle ring-1 ring-border-default/60">
        <Image src={src} alt="" fill sizes="40px" className="object-cover" />
      </span>
    );
  }

  const Icon = resolveCategoryLucideIcon(category.icon);
  return (
    <span
      aria-hidden
      className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary ring-1 ring-brand-primary/15"
    >
      <Icon className="size-5" strokeWidth={1.75} />
    </span>
  );
}

export default function CategoryBrowseMenu({
  categories,
  variant = "desktop",
  onNavigate,
}: Props) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const isMobile = variant === "mobile";
  const menuId = isMobile
    ? "header-category-menu-mobile"
    : "header-category-menu";
  const safeCategories = Array.isArray(categories) ? categories : [];

  return (
    <LazyMotion features={domAnimation} strict>
      <div
        className={isMobile ? "relative w-full" : "relative"}
        onMouseEnter={() => {
          if (!isMobile) setOpen(true);
        }}
        onMouseLeave={() => {
          if (!isMobile) setOpen(false);
        }}
      >
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="true"
          aria-controls={menuId}
          onClick={() => {
            if (isMobile) setOpen((v) => !v);
          }}
          className={
            isMobile
              ? "flex w-full items-center justify-center gap-2 rounded bg-brand-primary py-2.5 text-sm font-semibold text-white"
              : "flex cursor-pointer items-center gap-2.5 rounded bg-brand-primary px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-brand-hover"
          }
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            className="shrink-0"
            aria-hidden="true"
          >
            <circle cx="5" cy="4" r="1.6" fill="currentColor" />
            <circle cx="5" cy="9" r="1.6" fill="currentColor" />
            <circle cx="5" cy="14" r="1.6" fill="currentColor" />
            <circle cx="13" cy="4" r="1.6" fill="currentColor" />
            <circle cx="13" cy="9" r="1.6" fill="currentColor" />
            <circle cx="13" cy="14" r="1.6" fill="currentColor" />
          </svg>
          <span>Browse Category</span>
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
            className={`ml-0.5 stroke-current transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden
          >
            <path
              d="M1 1L5 5L9 1"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <AnimatePresence>
          {open ? (
            <m.div
              id={menuId}
              role="navigation"
              aria-label="Product categories"
              initial={
                reduceMotion
                  ? { opacity: 1 }
                  : { opacity: 0, y: isMobile ? -6 : 10 }
              }
              animate={{ opacity: 1, y: 0 }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: isMobile ? -4 : 8 }
              }
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={
                isMobile
                  ? "mt-2 overflow-hidden rounded-xl border border-border-default bg-bg-base shadow-lg"
                  : "absolute left-0 top-full z-40 w-[min(94vw,840px)] pt-2"
              }
            >
              <div
                className={
                  isMobile
                    ? undefined
                    : "overflow-hidden rounded-2xl border border-border-default bg-bg-base shadow-[0_18px_50px_rgba(0,0,0,0.14)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
                }
              >
                <div className="border-b border-border-default/70 bg-linear-to-r from-brand-primary/8 via-bg-base to-bg-subtle px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-primary">
                    Shop by category
                  </p>
                  <p className="mt-0.5 text-[13px] text-text-secondary">
                    Browse the full catalog — pick a department to start
                    shopping.
                  </p>
                </div>

                {safeCategories.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-text-secondary">
                    Categories will appear here once they are published.
                  </p>
                ) : (
                  <ul className="grid max-h-[min(70vh,480px)] grid-cols-1 gap-1.5 overflow-y-auto p-3 sm:grid-cols-2 lg:grid-cols-3">
                    {safeCategories.map((category, index) => {
                      const children = Array.isArray(category.children)
                        ? category.children
                        : [];
                      return (
                        <m.li
                          key={category.id}
                          initial={
                            reduceMotion ? false : { opacity: 0, y: 8 }
                          }
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            delay: reduceMotion
                              ? 0
                              : Math.min(index * 0.025, 0.2),
                            duration: 0.22,
                          }}
                        >
                          <div className="group h-full rounded-xl px-2.5 py-2.5 transition-colors hover:bg-brand-primary/8">
                            <Link
                              href={categoryShopHref(category.slug)}
                              onClick={() => {
                                setOpen(false);
                                onNavigate?.();
                              }}
                              className="flex items-start gap-2.5"
                            >
                              <CategoryGlyph category={category} />
                              <span className="min-w-0 flex-1">
                                <span className="flex items-start justify-between gap-1.5">
                                  <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-text-primary group-hover:text-brand-primary">
                                    {category.name}
                                  </span>
                                  <span className="shrink-0 pt-0.5 text-[10px] tabular-nums text-text-secondary">
                                    {category.products_count ?? 0}
                                  </span>
                                </span>
                                {children.length > 0 ? (
                                  <span className="mt-1 line-clamp-1 text-[11px] text-text-secondary">
                                    {children
                                      .slice(0, 3)
                                      .map((c) => c.name)
                                      .join(" · ")}
                                    {children.length > 3
                                      ? ` +${children.length - 3}`
                                      : ""}
                                  </span>
                                ) : (
                                  <span className="mt-0.5 block text-[11px] text-text-secondary">
                                    View products
                                  </span>
                                )}
                              </span>
                            </Link>
                            {children.length > 0 ? (
                              <ul className="mt-2 flex flex-wrap gap-1 pl-[2.75rem]">
                                {children.slice(0, 4).map((child) => (
                                  <li key={child.id}>
                                    <Link
                                      href={categoryShopHref(child.slug)}
                                      onClick={() => {
                                        setOpen(false);
                                        onNavigate?.();
                                      }}
                                      className="inline-flex rounded-full border border-border-default/70 bg-bg-subtle px-1.5 py-0.5 text-[10px] text-text-secondary transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
                                    >
                                      {child.name}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        </m.li>
                      );
                    })}
                  </ul>
                )}

                <div className="border-t border-border-default/70 bg-bg-subtle/60 px-4 py-2.5">
                  <Link
                    href="/shop"
                    onClick={() => {
                      setOpen(false);
                      onNavigate?.();
                    }}
                    className="text-[13px] font-medium text-brand-primary hover:underline"
                  >
                    View all products →
                  </Link>
                </div>
              </div>
            </m.div>
          ) : null}
        </AnimatePresence>

        <nav className="sr-only" aria-label="All product categories">
          <ul>
            {safeCategories.map((category) => (
              <li key={`seo-${category.id}`}>
                <Link href={categoryShopHref(category.slug)}>
                  {category.name}
                </Link>
                {(category.children?.length ?? 0) > 0 ? (
                  <ul>
                    {category.children.map((child) => (
                      <li key={`seo-${child.id}`}>
                        <Link href={categoryShopHref(child.slug)}>
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </LazyMotion>
  );
}
