"use client";

import Image from "next/image";
import Link from "next/link";
import type { ShopProduct, ShopViewMode } from "./types";

function StarRating({
    rating,
    reviewCount,
}: {
    rating: number;
    reviewCount: number;
}) {
    return (
        <div
            className="flex items-center gap-1.5"
            aria-label={`Rating: ${rating} out of 5 stars, ${reviewCount} reviews`}
        >
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                        key={star}
                        width="14"
                        height="14"
                        viewBox="0 0 20 20"
                        fill={star <= rating ? "#FF8A00" : "none"}
                        stroke="#FF8A00"
                        strokeWidth="1.5"
                        aria-hidden="true"
                    >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                ))}
            </div>
            <span className="text-[12px] text-text-secondary">
                ({reviewCount}) Reviews
            </span>
        </div>
    );
}

function formatPrice(value: number) {
    return value.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
    });
}

interface ShopProductCardProps {
    product: ShopProduct;
    viewMode: ShopViewMode;
    onQuickView: (product: ShopProduct) => void;
}

export default function ShopProductCard({
    product,
    viewMode,
    onQuickView,
}: ShopProductCardProps) {
    const isList = viewMode === "list";

    return (
        <article
            className={`group relative bg-bg-surface border border-border-default rounded-lg overflow-hidden transition-all duration-200 hover:border-brand-primary hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)] ${
                isList ? "flex flex-col sm:flex-row gap-4 p-4" : "flex flex-col"
            }`}
        >
            {/* Image */}
            <div
                className={`relative bg-bg-subtle ${
                    isList
                        ? "w-full sm:w-48 h-44 shrink-0 rounded-md overflow-hidden"
                        : "w-full aspect-square"
                }`}
            >
                {product.isNew && (
                    <span className="absolute top-3 left-0 z-10 -skew-x-12 bg-brand-primary text-white text-[10px] font-bold px-2.5 py-1 tracking-wider">
                        <span className="skew-x-12 inline-block">NEW</span>
                    </span>
                )}

                <Link
                    href={`/shop/${product.id}`}
                    className="absolute inset-0 flex items-center justify-center p-4"
                >
                    <Image
                        src={product.image}
                        alt={product.alt}
                        fill
                        sizes={
                            isList
                                ? "192px"
                                : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        }
                        className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                    />
                </Link>

                {/* Hover actions */}
                <div className="absolute bottom-3 right-3 flex flex-col gap-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-10">
                    <button
                        type="button"
                        aria-label="Add to wishlist"
                        className="h-8 w-8 rounded-full bg-bg-surface border border-border-default flex items-center justify-center text-text-secondary hover:text-brand-primary hover:border-brand-primary cursor-pointer shadow-sm"
                    >
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                        >
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        aria-label="Quick view"
                        onClick={() => onQuickView(product)}
                        className="h-8 w-8 rounded-full bg-bg-surface border border-border-default flex items-center justify-center text-text-secondary hover:text-brand-primary hover:border-brand-primary cursor-pointer shadow-sm"
                    >
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                        >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Meta */}
            <div
                className={`flex flex-col ${
                    isList
                        ? "flex-1 justify-center gap-2 py-1"
                        : "px-4 pt-3 pb-5 gap-1.5"
                }`}
            >
                <StarRating
                    rating={product.rating}
                    reviewCount={product.reviewCount}
                />

                <h3 className="text-[14px] sm:text-[15px] font-medium text-text-primary leading-snug line-clamp-2 m-0">
                    <Link
                        href={`/shop/${product.id}`}
                        className="hover:text-brand-primary transition-colors"
                    >
                        {product.name}
                    </Link>
                </h3>

                <p className="text-[13px] text-brand-primary m-0">
                    Available: {product.available}
                </p>

                <p className="text-[15px] font-semibold text-brand-primary m-0 mt-0.5">
                    {formatPrice(product.priceMin)} -{" "}
                    {formatPrice(product.priceMax)}
                </p>
            </div>
        </article>
    );
}
