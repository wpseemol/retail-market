"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ShopProduct, ShopViewMode } from "./types";
import { useAppDispatch } from "@/store/hooks";
import { addToCart } from "@/store/cartSlice";
import { formatPriceRange } from "@/lib/money";
import { useWishlist } from "@/hooks/useWishlist";

function ProductThumb({
  src,
  alt,
  sizes,
  className,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
}) {
  if (/^https?:\/\//i.test(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={`absolute inset-0 size-full ${className ?? ""}`}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
    />
  );
}

function StarRating({
    rating,
    reviewCount,
    size = 14,
}: {
    rating: number;
    reviewCount: number;
    size?: number;
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
                        width={size}
                        height={size}
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

function ActionButton({
    label,
    onClick,
    tooltipSide = "top",
    pressed,
    disabled,
    children,
}: {
    label: string;
    onClick?: () => void;
    tooltipSide?: "top" | "left";
    pressed?: boolean;
    disabled?: boolean;
    children: ReactNode;
}) {
    const tooltipPosition =
        tooltipSide === "left"
            ? "right-full top-1/2 -translate-y-1/2 mr-2.5"
            : "bottom-full left-1/2 -translate-x-1/2 mb-2.5";

    const arrowPosition =
        tooltipSide === "left"
            ? "left-full top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-l-4 border-l-[#1A1A1A] dark:border-l-white"
            : "top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-[#1A1A1A] dark:border-t-white";

    return (
        <div className="relative inline-flex group/tip">
            <button
                type="button"
                aria-label={label}
                aria-pressed={pressed}
                aria-busy={disabled || undefined}
                title={label}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!disabled) onClick?.();
                }}
                className={`h-8 w-8 rounded-full border flex items-center justify-center cursor-pointer shadow-sm transition-colors ${
                    pressed
                        ? "bg-brand-primary border-brand-primary text-white hover:bg-brand-hover hover:border-brand-hover"
                        : "bg-bg-surface border-border-default text-text-secondary hover:text-brand-primary hover:border-brand-primary"
                } ${disabled ? "opacity-70" : ""}`}
            >
                {children}
            </button>

            <span
                role="tooltip"
                className={`pointer-events-none absolute z-30 whitespace-nowrap rounded-ex bg-[#1A1A1A] dark:bg-white px-2.5 py-1 text-[11px] font-medium tracking-wide text-white dark:text-[#1A1A1A] opacity-0 scale-95 shadow-[0_6px_16px_rgba(0,0,0,0.18)] transition-all duration-150 ease-out group-hover/tip:opacity-100 group-hover/tip:scale-100 ${tooltipPosition}`}
            >
                {label}
                <span
                    aria-hidden="true"
                    className={`absolute h-0 w-0 ${arrowPosition}`}
                />
            </span>
        </div>
    );
}

function HeartIcon({ filled = false }: { filled?: boolean }) {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
        >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
    );
}

/** Eye — opens Quick View modal popup */
function EyeIcon() {
    return (
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
    );
}

/** Expand — opens the full product details page */
function ExpandIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
    );
}

function CompareIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <rect x="3" y="3" width="7" height="18" rx="1" />
            <rect x="14" y="8" width="7" height="13" rx="1" />
        </svg>
    );
}

function CartIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function BoltIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
    );
}

function PurchaseButtons({
    added,
    onAddToCart,
    onBuyNow,
    compact = false,
    className = "",
}: {
    added: boolean;
    onAddToCart: () => void;
    onBuyNow: () => void;
    compact?: boolean;
    className?: string;
}) {
    const base = `group/btn relative inline-flex flex-1 items-center justify-center gap-1.5 overflow-hidden rounded-lg font-semibold whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface ${
        compact ? "h-9 px-2 text-[11.5px]" : "h-10 px-3 text-[13px]"
    }`;

    return (
        <div className={`flex gap-2 ${className}`}>
            <button
                type="button"
                aria-label={added ? "Added to cart" : "Add to cart"}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onAddToCart();
                }}
                className={`${base} border ${
                    added
                        ? "border-brand-primary bg-brand-primary/15 text-brand-primary"
                        : "border-brand-primary/50 bg-brand-primary/5 text-brand-primary hover:border-brand-primary hover:bg-brand-primary hover:text-white"
                }`}
            >
                <span>
                    {added ? <CheckIcon /> : <CartIcon />}
                </span>
                <span>{added ? "Added" : "Add to Cart"}</span>
            </button>
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onBuyNow();
                }}
                className={`${base} bg-brand-primary text-white shadow-[0_8px_18px_-8px_var(--color-brand-primary)] hover:bg-brand-hover hover:shadow-[0_10px_24px_-8px_var(--color-brand-primary)]`}
            >
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-linear-to-r from-transparent via-white/30 to-transparent transition-[left] duration-500 ease-out group-hover/btn:left-[150%]"
                />
                <span>
                    <BoltIcon />
                </span>
                <span>Buy Now</span>
            </button>
        </div>
    );
}

function productDescription(product: ShopProduct) {
    return (
        product.description ??
        `${product.name} offers reliable performance and everyday value with a modern design for home, office, or entertainment use.`
    );
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
    const router = useRouter();
    const dispatch = useAppDispatch();
    const wishlist = useWishlist();
    const saved = wishlist.isWishlisted(product.id);
    const savingWishlist = wishlist.isPending(product.id);
    const wishlistLabel = saved ? "Remove from Wishlist" : "Add to Wishlist";
    const toggleWishlist = () => void wishlist.toggle(product.id);
    const [added, setAdded] = useState(false);
    const addedTimer = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (addedTimer.current) window.clearTimeout(addedTimer.current);
        };
    }, []);

    const dispatchAdd = () => {
        dispatch(
            addToCart({
                id: product.id,
                name: product.name,
                image: product.image,
                alt: product.alt,
                price: product.priceMin,
                quantity: 1,
            }),
        );
    };

    const handleAddToCart = () => {
        dispatchAdd();
        setAdded(true);
        if (addedTimer.current) window.clearTimeout(addedTimer.current);
        addedTimer.current = window.setTimeout(() => setAdded(false), 1600);
    };

    const handleBuyNow = () => {
        dispatchAdd();
        router.push("/checkout");
    };

    const handleExpandProduct = () => {
        router.push(`/shop/${product.slug}`);
    };

    if (viewMode === "list") {
        return (
            <article className="group relative flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-5 bg-bg-surface border border-border-default rounded-lg transition-all duration-200 hover:border-brand-primary hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
                <div className="relative w-full sm:w-52 md:w-60 h-48 sm:h-52 shrink-0 rounded-md overflow-hidden bg-bg-subtle">
                    {product.isNew && (
                        <span className="absolute top-3 left-0 z-10 -skew-x-12 bg-brand-primary text-white text-[10px] font-bold px-2.5 py-1 tracking-wider">
                            <span className="skew-x-12 inline-block">NEW</span>
                        </span>
                    )}
                    <Link
                        href={`/shop/${product.slug}`}
                        className="absolute inset-0"
                    >
                        <ProductThumb
                            src={product.image}
                            alt={product.alt}
                            sizes="240px"
                            className="object-contain p-4"
                        />
                    </Link>
                </div>

                <div className="flex-1 flex flex-col justify-center gap-2 min-w-0 py-1">
                    <StarRating
                        rating={product.rating}
                        reviewCount={product.reviewCount}
                        size={15}
                    />

                    <h3 className="text-[16px] sm:text-[18px] font-semibold text-text-primary leading-snug m-0">
                        <Link
                            href={`/shop/${product.slug}`}
                            className="hover:text-brand-primary transition-colors"
                        >
                            {product.name}
                        </Link>
                    </h3>

                    <p className="text-[16px] font-bold text-brand-primary m-0">
                            {formatPriceRange(product.priceMin, product.priceMax)}
                    </p>

                    <p className="text-[13px] text-text-secondary leading-relaxed m-0 line-clamp-2 max-w-2xl">
                        {productDescription(product)}
                    </p>

                    <p className="text-[13px] text-brand-primary m-0">
                        Available: {product.available}
                    </p>

                    <div className="flex items-center gap-2 pt-2">
                        <ActionButton
                            label={wishlistLabel}
                            pressed={saved}
                            disabled={savingWishlist}
                            onClick={toggleWishlist}
                        >
                            <HeartIcon filled={saved} />
                        </ActionButton>
                        <ActionButton label="Compare">
                            <CompareIcon />
                        </ActionButton>
                        <ActionButton
                            label="Quick View"
                            onClick={() => onQuickView(product)}
                        >
                            <EyeIcon />
                        </ActionButton>
                        <ActionButton
                            label="View Full Product"
                            onClick={handleExpandProduct}
                        >
                            <ExpandIcon />
                        </ActionButton>
                        <PurchaseButtons
                            added={added}
                            onAddToCart={handleAddToCart}
                            onBuyNow={handleBuyNow}
                            className="ml-1 w-full max-w-xs"
                        />
                    </div>
                </div>
            </article>
        );
    }

    const isCompact = viewMode === "grid4";
    const isWide = viewMode === "grid2";

    return (
        <article
            className={`group relative flex flex-col bg-bg-surface border border-border-default rounded-lg hover:border-brand-primary ${
                isWide
                    ? "sm:flex-row sm:items-stretch hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
                    : "after:pointer-events-auto after:absolute after:inset-x-0 after:top-full after:hidden after:h-2 after:content-[''] hover:after:block hover:z-30 hover:rounded-b-none hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_-12px_rgba(0,0,0,0.22)] dark:hover:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_12px_28px_-12px_rgba(0,0,0,0.7)] [@media(hover:hover)]:focus-within:z-30 [@media(hover:hover)]:focus-within:rounded-b-none [@media(hover:hover)]:focus-within:border-brand-primary"
            }`}
        >
            <div
                className={`relative ${
                    isWide ? "w-full sm:w-[46%] shrink-0" : "w-full"
                }`}
            >
                <div
                    className={`relative bg-bg-subtle overflow-hidden rounded-t-lg ${
                        isWide
                            ? "aspect-4/3 sm:aspect-auto sm:min-h-56 sm:rounded-l-lg sm:rounded-tr-none sm:h-full"
                            : "w-full aspect-square"
                    }`}
                >
                    {product.isNew && (
                        <span className="absolute top-3 left-0 z-10 -skew-x-12 bg-brand-primary text-white text-[10px] font-bold px-2.5 py-1 tracking-wider">
                            <span className="skew-x-12 inline-block">NEW</span>
                        </span>
                    )}

                    <Link
                        href={`/shop/${product.slug}`}
                        className="absolute inset-0 flex items-center justify-center p-4"
                    >
                        <ProductThumb
                            src={product.image}
                            alt={product.alt}
                            sizes={
                                viewMode === "grid4"
                                    ? "(max-width: 768px) 50vw, 25vw"
                                    : viewMode === "grid2"
                                      ? "(max-width: 768px) 100vw, 40vw"
                                      : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            }
                            className="object-contain p-3"
                        />
                    </Link>
                </div>

                {saved && (
                    <span
                        aria-hidden="true"
                        className="absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full bg-brand-primary text-white shadow-sm group-hover:opacity-0 group-focus-within:opacity-0"
                    >
                        <HeartIcon filled />
                    </span>
                )}
                <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 z-20">
                    <ActionButton
                        label={wishlistLabel}
                        tooltipSide="left"
                        pressed={saved}
                        disabled={savingWishlist}
                        onClick={toggleWishlist}
                    >
                        <HeartIcon filled={saved} />
                    </ActionButton>
                    {!isCompact && (
                        <ActionButton label="Compare" tooltipSide="left">
                            <CompareIcon />
                        </ActionButton>
                    )}
                    <ActionButton
                        label="Quick View"
                        tooltipSide="left"
                        onClick={() => onQuickView(product)}
                    >
                        <EyeIcon />
                    </ActionButton>
                    <ActionButton
                        label="View Full Product"
                        tooltipSide="left"
                        onClick={handleExpandProduct}
                    >
                        <ExpandIcon />
                    </ActionButton>
                </div>
            </div>

            <div
                className={`flex flex-col ${
                    isWide
                        ? "flex-1 justify-center px-5 py-5 gap-2"
                        : isCompact
                          ? "px-3 pt-2.5 pb-4 gap-1"
                          : "px-4 pt-3 pb-5 gap-1.5"
                }`}
            >
                <StarRating
                    rating={product.rating}
                    reviewCount={product.reviewCount}
                    size={isCompact ? 12 : 14}
                />

                <h3
                    className={`font-medium text-text-primary leading-snug line-clamp-2 m-0 ${
                        isWide
                            ? "text-[16px] sm:text-[17px]"
                            : isCompact
                              ? "text-[13px]"
                              : "text-[14px] sm:text-[15px]"
                    }`}
                >
                    <Link
                        href={`/shop/${product.slug}`}
                        className="hover:text-brand-primary transition-colors"
                    >
                        {product.name}
                    </Link>
                </h3>

                {isWide && (
                    <p className="text-[13px] text-text-secondary leading-relaxed m-0 line-clamp-2">
                        {productDescription(product)}
                    </p>
                )}

                <p
                    className={`text-brand-primary m-0 ${
                        isCompact ? "text-[12px]" : "text-[13px]"
                    }`}
                >
                    Available: {product.available}
                </p>

                <p
                    className={`font-semibold text-brand-primary m-0 ${
                        isWide
                            ? "text-[17px] mt-1"
                            : isCompact
                              ? "text-[13px] mt-0.5"
                              : "text-[15px] mt-0.5"
                    }`}
                >
                            {formatPriceRange(product.priceMin, product.priceMax)}
                </p>

                {isWide && (
                    <PurchaseButtons
                        added={added}
                        onAddToCart={handleAddToCart}
                        onBuyNow={handleBuyNow}
                        className="mt-2 w-full max-w-xs"
                    />
                )}
            </div>

            {!isWide && (
                <div className="absolute -inset-x-px top-full grid grid-rows-[0fr] invisible pointer-events-none rounded-b-lg border border-t-0 border-border-default bg-bg-surface shadow-[0_16px_28px_-14px_rgba(0,0,0,0.25)] dark:shadow-[0_16px_28px_-14px_rgba(0,0,0,0.7)] [clip-path:inset(0_-40px_-40px_-40px)] group-hover:grid-rows-[1fr] group-hover:visible group-hover:pointer-events-auto group-hover:border-brand-primary [@media(hover:hover)]:group-focus-within:grid-rows-[1fr] [@media(hover:hover)]:group-focus-within:visible [@media(hover:hover)]:group-focus-within:pointer-events-auto [@media(hover:hover)]:group-focus-within:border-brand-primary [@media(hover:none)]:static [@media(hover:none)]:grid-rows-[1fr] [@media(hover:none)]:visible [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:border-0 [@media(hover:none)]:shadow-none">
                    <div className="min-h-0 overflow-hidden">
                        <div
                            className={`opacity-0 group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 ${
                                isCompact ? "px-3 pb-3" : "px-4 pb-4"
                            }`}
                        >
                            <div
                                aria-hidden="true"
                                className={`h-px bg-border-default/70 ${
                                    isCompact ? "mb-2.5" : "mb-3"
                                }`}
                            />
                            <PurchaseButtons
                                added={added}
                                onAddToCart={handleAddToCart}
                                onBuyNow={handleBuyNow}
                                compact={isCompact}
                            />
                        </div>
                    </div>
                </div>
            )}
        </article>
    );
}
