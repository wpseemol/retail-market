"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/money";
import { SHOP_BRANDS, SHOP_CATEGORIES } from "./data";
import type { ShopProduct } from "./types";
import { useAppDispatch } from "@/store/hooks";
import { addToCart } from "@/store/cartSlice";

interface QuickViewModalProps {
    product: ShopProduct;
    onClose: () => void;
}

function ProductImage({
    src,
    alt,
    fill,
    sizes,
    className,
    priority,
    "aria-hidden": ariaHidden,
}: {
    src: string;
    alt: string;
    fill?: boolean;
    sizes?: string;
    className?: string;
    priority?: boolean;
    "aria-hidden"?: boolean;
}) {
    if (/^https?:\/\//i.test(src)) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={src}
                alt={alt}
                className={
                    fill
                        ? `absolute inset-0 size-full ${className ?? ""}`
                        : className
                }
                aria-hidden={ariaHidden}
            />
        );
    }
    return (
        <Image
            src={src}
            alt={alt}
            fill={fill}
            sizes={sizes}
            className={className}
            priority={priority}
            aria-hidden={ariaHidden}
        />
    );
}

function StarRating({
    rating,
    reviewCount,
}: {
    rating: number;
    reviewCount: number;
}) {
    return (
        <div
            className="flex items-center gap-2"
            aria-label={`Rating: ${rating} out of 5 stars, ${reviewCount} reviews`}
        >
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                        key={star}
                        width="16"
                        height="16"
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
            <span className="text-[13px] text-text-secondary">
                ({reviewCount}) Review
            </span>
        </div>
    );
}

const SHARE_LINKS = [
    { label: "WhatsApp", color: "#25D366", href: "#" },
    { label: "Gmail", color: "#EA4335", href: "#" },
    { label: "Facebook", color: "#1877F2", href: "#" },
    { label: "Messenger", color: "#0084FF", href: "#" },
    { label: "X", color: "#000000", href: "#" },
    { label: "Pinterest", color: "#E60023", href: "#" },
] as const;

export default function QuickViewModal({
    product,
    onClose,
}: QuickViewModalProps) {
    const dispatch = useAppDispatch();
    const titleId = useId();
    const gallery = useMemo(() => {
        if (product.gallery && product.gallery.length > 0) {
            return product.gallery;
        }
        return [product.image];
    }, [product.gallery, product.image]);

    const [activeImage, setActiveImage] = useState(gallery[0]);
    const [quantity, setQuantity] = useState(1);

    const brandLabel =
        SHOP_BRANDS.find((b) => b.id === product.brand)?.label ??
        product.model ??
        product.brand;
    const categoryLabel =
        SHOP_CATEGORIES.find((c) => c.id === product.category)?.label ??
        product.categoryLabels?.[1] ??
        product.category;
    const sku =
        product.sku ??
        `33.01.${String(product.id).padStart(3, "0")}.${String(product.id * 121).slice(0, 4)}`;
    const model = product.model ?? `${brandLabel} ${categoryLabel}`;
    const categories =
        product.categoryLabels?.join(", ") ?? `${brandLabel}, ${categoryLabel}`;
    const description =
        product.description ??
        `${product.name} delivers reliable everyday performance with modern design. Enjoy smooth multitasking, crisp display quality, and long-lasting value for home, school, or work.`;
    const tags = product.tags.slice(0, 3).map((tag) => tag.toLowerCase());

    const handleAddToCart = () => {
        dispatch(
            addToCart({
                id: product.id,
                name: product.name,
                image: product.image,
                alt: product.alt,
                price: product.priceMin,
                quantity,
            }),
        );
    };

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [onClose]);

    useEffect(() => {
        setActiveImage(gallery[0]);
        setQuantity(1);
    }, [product.id, gallery]);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
            role="presentation"
        >
            <button
                type="button"
                aria-label="Close quick view overlay"
                className="absolute inset-0 bg-overlay-scrim cursor-pointer border-0"
                onClick={onClose}
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative z-10 w-full max-w-[1156px] max-h-[min(90vh,720px)] overflow-y-auto rounded-[2px] bg-bg-surface border border-border-default shadow-[0_24px_64px_rgba(0,0,0,0.28)]"
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close quick view"
                    className="absolute top-3 right-3 z-20 h-9 w-9 rounded-full bg-bg-subtle border border-border-default text-text-secondary hover:text-text-primary hover:border-brand-primary flex items-center justify-center cursor-pointer transition-colors"
                >
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        aria-hidden="true"
                    >
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 p-5 sm:p-7 lg:p-8">
                    {/* Gallery */}
                    <div className="lg:col-span-5 flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <div className="relative flex-1 min-h-64 sm:min-h-80 rounded-lg border border-border-default bg-bg-subtle overflow-hidden">
                            <ProductImage
                                src={activeImage}
                                alt={product.alt}
                                fill
                                sizes="(max-width: 1024px) 100vw, 420px"
                                className="object-contain p-6"
                                priority
                            />
                        </div>

                        <div className="flex sm:flex-col gap-2.5 shrink-0 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">
                            {gallery.map((src, index) => {
                                const isActive = src === activeImage;
                                return (
                                    <button
                                        key={`${src}-${index}`}
                                        type="button"
                                        onClick={() => setActiveImage(src)}
                                        aria-label={`View image ${index + 1}`}
                                        aria-pressed={isActive}
                                        className={`relative h-16 w-16 sm:h-[72px] sm:w-[72px] rounded-md border overflow-hidden bg-bg-subtle shrink-0 cursor-pointer transition-colors ${
                                            isActive
                                                ? "border-brand-primary ring-1 ring-brand-primary/40"
                                                : "border-border-default hover:border-brand-primary"
                                        }`}
                                    >
                                        <ProductImage
                                            src={src}
                                            alt=""
                                            fill
                                            sizes="72px"
                                            className="object-contain p-1.5"
                                            aria-hidden
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Details */}
                    <div className="lg:col-span-7 flex flex-col gap-3.5 pr-2">
                        <h2
                            id={titleId}
                            className="text-[22px] sm:text-[26px] font-bold text-text-primary leading-snug m-0 pr-8"
                        >
                            {product.name}
                        </h2>

                        <StarRating
                            rating={product.rating}
                            reviewCount={product.reviewCount}
                        />

                        <div className="flex items-baseline gap-2.5">
                            <span className="text-[22px] font-bold text-brand-primary">
                                {formatPrice(product.priceMin)}
                            </span>
                            <span className="text-[15px] text-text-secondary line-through">
                                {formatPrice(product.priceMax)}
                            </span>
                        </div>

                        <p className="text-[13px] text-text-secondary m-0">
                            Product Id:{" "}
                            <span className="text-text-primary">{sku}</span>
                        </p>

                        <p className="text-[14px] text-text-secondary leading-relaxed m-0">
                            {description}
                        </p>

                        <div className="flex flex-col gap-1.5 text-[13px]">
                            <p className="m-0 text-text-secondary">
                                Model:{" "}
                                <span className="text-text-primary">
                                    {model}
                                </span>
                            </p>
                            <p className="m-0 text-text-secondary">
                                Categories:{" "}
                                <span className="text-text-primary">
                                    {categories}
                                </span>
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                            {tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="text-[12px] px-3 py-1.5 rounded bg-bg-subtle border border-border-default text-text-secondary"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>

                        {/* Actions row */}
                        <div className="flex flex-wrap items-center gap-2.5 pt-2">
                            <div className="inline-flex items-center border border-border-default rounded-md bg-bg-base overflow-hidden">
                                <button
                                    type="button"
                                    aria-label="Decrease quantity"
                                    onClick={() =>
                                        setQuantity((q) => Math.max(1, q - 1))
                                    }
                                    className="h-11 w-10 text-text-primary hover:bg-bg-subtle cursor-pointer transition-colors"
                                >
                                    −
                                </button>
                                <span className="min-w-10 text-center text-[15px] font-medium text-text-primary tabular-nums">
                                    {quantity}
                                </span>
                                <button
                                    type="button"
                                    aria-label="Increase quantity"
                                    onClick={() =>
                                        setQuantity((q) => Math.min(99, q + 1))
                                    }
                                    className="h-11 w-10 text-text-primary hover:bg-bg-subtle cursor-pointer transition-colors"
                                >
                                    +
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={handleAddToCart}
                                className="h-11 px-6 rounded-md bg-brand-primary hover:bg-brand-hover text-white text-[14px] font-semibold transition-colors cursor-pointer"
                            >
                                Add to Cart
                            </button>

                            <button
                                type="button"
                                className="h-11 px-5 rounded-md border border-border-default bg-bg-subtle text-text-primary text-[14px] font-medium hover:border-brand-primary hover:text-brand-primary transition-colors cursor-pointer"
                            >
                                Compare
                            </button>

                            <button
                                type="button"
                                aria-label="Add to wishlist"
                                className="h-11 w-11 rounded-md border border-border-default bg-bg-subtle text-text-secondary hover:text-brand-primary hover:border-brand-primary flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    aria-hidden="true"
                                >
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                </svg>
                            </button>
                        </div>

                        {/* Utility buttons */}
                        <div className="flex flex-col gap-2.5 pt-1">
                            <button
                                type="button"
                                className="w-full h-11 px-4 rounded-md border border-border-default bg-bg-subtle text-text-primary text-[13px] font-medium flex items-center gap-3 hover:border-brand-primary transition-colors cursor-pointer text-left"
                            >
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="text-brand-primary shrink-0"
                                    aria-hidden="true"
                                >
                                    <path d="M1 3h15v13H1zM16 8h4l3 5v3h-7V8z" />
                                    <circle cx="5.5" cy="18.5" r="2.5" />
                                    <circle cx="18.5" cy="18.5" r="2.5" />
                                </svg>
                                Shipping &amp; Charge
                            </button>
                            <button
                                type="button"
                                className="w-full h-11 px-4 rounded-md border border-border-default bg-bg-subtle text-text-primary text-[13px] font-medium flex items-center gap-3 hover:border-brand-primary transition-colors cursor-pointer text-left"
                            >
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="text-brand-primary shrink-0"
                                    aria-hidden="true"
                                >
                                    <rect
                                        x="2"
                                        y="5"
                                        width="20"
                                        height="14"
                                        rx="2"
                                    />
                                    <path d="M2 10h20" />
                                </svg>
                                Payment Method
                            </button>
                        </div>

                        {/* Share */}
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <span className="text-[13px] font-medium text-text-primary">
                                Share:
                            </span>
                            <div className="flex items-center gap-2">
                                {SHARE_LINKS.map((item) => (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        aria-label={`Share on ${item.label}`}
                                        className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold hover:opacity-90 transition-opacity"
                                        style={{ backgroundColor: item.color }}
                                    >
                                        {item.label.slice(0, 1)}
                                    </Link>
                                ))}
                                <button
                                    type="button"
                                    aria-label="Copy product link"
                                    className="h-8 w-8 rounded-full border border-border-default bg-bg-subtle text-text-secondary hover:text-brand-primary flex items-center justify-center cursor-pointer transition-colors"
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
                                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
