"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    DEFAULT_PRODUCT_SPECS,
    PRODUCT_QUESTIONS,
    PRODUCT_REVIEWS,
    SHOP_BRANDS,
    SHOP_CATEGORIES,
    getProductGallery,
    getRelatedProducts,
} from "./data";
import type { ProductTabId, ShopProduct } from "./types";

interface ProductPageContentProps {
    product: ShopProduct;
}

const TABS: { id: ProductTabId; label: string }[] = [
    { id: "specification", label: "Specification" },
    { id: "description", label: "Description" },
    { id: "qa", label: "Q&A" },
    { id: "review", label: "Review" },
];

const SHARE_LINKS = [
    { label: "WhatsApp", color: "#25D366", href: "#" },
    { label: "Gmail", color: "#EA4335", href: "#" },
    { label: "Facebook", color: "#1877F2", href: "#" },
    { label: "Messenger", color: "#0084FF", href: "#" },
    { label: "X", color: "#000000", href: "#" },
    { label: "Pinterest", color: "#E60023", href: "#" },
] as const;

function formatPrice(value: number) {
    return value.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
    });
}

function StarRating({
    rating,
    reviewCount,
    showCount = true,
}: {
    rating: number;
    reviewCount?: number;
    showCount?: boolean;
}) {
    return (
        <div
            className="flex items-center gap-2"
            aria-label={
                showCount && reviewCount != null
                    ? `Rating: ${rating} out of 5 stars, ${reviewCount} reviews`
                    : `Rating: ${rating} out of 5 stars`
            }
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
            {showCount && reviewCount != null && (
                <span className="text-[13px] text-text-secondary">
                    ({reviewCount}) Review
                </span>
            )}
        </div>
    );
}

function CartIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
        >
            <circle cx="9" cy="20" r="1.5" />
            <circle cx="17" cy="20" r="1.5" />
            <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H7" />
        </svg>
    );
}

export default function ProductPageContent({ product }: ProductPageContentProps) {
    const gallery = useMemo(() => getProductGallery(product), [product]);
    const relatedProducts = useMemo(
        () => getRelatedProducts(product, 4),
        [product],
    );

    const [activeImage, setActiveImage] = useState(gallery[0]);
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState<ProductTabId>("specification");
    const [relatedIndex, setRelatedIndex] = useState(0);
    const [showBackToTop, setShowBackToTop] = useState(false);

    const brandLabel =
        SHOP_BRANDS.find((b) => b.id === product.brand)?.label ?? product.brand;
    const categoryLabel =
        SHOP_CATEGORIES.find((c) => c.id === product.category)?.label ??
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

    useEffect(() => {
        setActiveImage(gallery[0]);
        setQuantity(1);
        setActiveTab("specification");
        setRelatedIndex(0);
    }, [product.id, gallery]);

    useEffect(() => {
        const onScroll = () => setShowBackToTop(window.scrollY > 420);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const visibleRelated = relatedProducts.slice(
        relatedIndex,
        relatedIndex + 3,
    );

    const canPrevRelated = relatedIndex > 0;
    const canNextRelated = relatedIndex + 3 < relatedProducts.length;

    return (
        <div className="bg-bg-base text-text-primary">
            {/* Breadcrumb */}
            <nav
                aria-label="Breadcrumb"
                className="w-full border-b border-border-default bg-bg-subtle/60"
            >
                <div className="container mx-auto px-4 sm:px-6 py-3.5">
                    <ol className="flex items-center gap-2 text-[13px] list-none m-0 p-0">
                        <li>
                            <Link
                                href="/"
                                className="text-text-secondary hover:text-brand-primary transition-colors"
                            >
                                Home
                            </Link>
                        </li>
                        <li aria-hidden="true" className="text-text-secondary">
                            &gt;
                        </li>
                        <li>
                            <Link
                                href="/shop"
                                className="text-brand-primary font-medium hover:text-brand-hover transition-colors"
                            >
                                Shop
                            </Link>
                        </li>
                    </ol>
                </div>
            </nav>

            <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-10">
                {/* Top: gallery + details */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10">
                    {/* Gallery: main + vertical thumbs */}
                    <div className="lg:col-span-5 flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <div className="relative flex-1 min-h-[280px] sm:min-h-[360px] lg:min-h-[420px] rounded-lg border border-border-default bg-bg-subtle overflow-hidden">
                            <Image
                                src={activeImage}
                                alt={product.alt}
                                fill
                                sizes="(max-width: 1024px) 100vw, 420px"
                                className="object-contain p-5 sm:p-8"
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
                                        className={`relative h-[68px] w-[68px] sm:h-[76px] sm:w-[76px] rounded-md border overflow-hidden bg-bg-subtle shrink-0 cursor-pointer transition-colors ${
                                            isActive
                                                ? "border-brand-primary ring-1 ring-brand-primary/40"
                                                : "border-border-default hover:border-brand-primary"
                                        }`}
                                    >
                                        <Image
                                            src={src}
                                            alt=""
                                            fill
                                            sizes="76px"
                                            className="object-contain p-1.5"
                                            aria-hidden="true"
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Details */}
                    <div className="lg:col-span-7 flex flex-col gap-3.5">
                        <h1 className="text-[22px] sm:text-[26px] lg:text-[28px] font-bold text-text-primary leading-snug m-0">
                            {product.name}
                        </h1>

                        <StarRating
                            rating={product.rating}
                            reviewCount={product.reviewCount}
                        />

                        <p className="text-[22px] sm:text-[24px] font-bold text-brand-primary m-0">
                            {formatPrice(product.priceMin)} -{" "}
                            {formatPrice(product.priceMax)}
                        </p>

                        <p className="text-[13px] text-text-secondary m-0">
                            Product id:{" "}
                            <span className="text-text-primary">{sku}</span>
                        </p>

                        <p className="text-[14px] text-text-secondary leading-relaxed m-0 max-w-2xl">
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

                        <div className="flex flex-wrap gap-2 pt-0.5">
                            {tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="text-[12px] px-3 py-1.5 rounded bg-bg-subtle border border-border-default text-text-secondary"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>

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
                                className="h-11 px-6 rounded-md bg-brand-primary hover:bg-brand-hover text-white text-[14px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-2"
                            >
                                <CartIcon />
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

                        <div className="flex flex-col gap-2.5 pt-1 max-w-xl">
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
                                    onClick={() => {
                                        if (typeof window !== "undefined") {
                                            void navigator.clipboard?.writeText(
                                                window.location.href,
                                            );
                                        }
                                    }}
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

                {/* Tabs + Related */}
                <div className="mt-10 lg:mt-14 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                    <div className="lg:col-span-8 xl:col-span-9">
                        <div
                            role="tablist"
                            aria-label="Product information"
                            className="flex flex-wrap gap-2 sm:gap-3 mb-5"
                        >
                            {TABS.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={isActive}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`h-10 px-4 sm:px-5 rounded-md text-[13px] sm:text-[14px] font-medium cursor-pointer transition-colors border ${
                                            isActive
                                                ? "bg-brand-primary border-brand-primary text-white"
                                                : "bg-bg-subtle border-border-default text-text-secondary hover:border-brand-primary hover:text-brand-primary"
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        <div
                            role="tabpanel"
                            className="rounded-lg border border-border-default bg-bg-surface p-4 sm:p-6"
                        >
                            {activeTab === "specification" && (
                                <div>
                                    <h2 className="text-[18px] font-bold text-text-primary m-0 mb-4">
                                        Specification
                                    </h2>
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse text-[13px] sm:text-[14px]">
                                            <tbody>
                                                {DEFAULT_PRODUCT_SPECS.map(
                                                    (section) => (
                                                        <FragmentSpecSection
                                                            key={section.title}
                                                            title={
                                                                section.title
                                                            }
                                                            rows={section.rows}
                                                        />
                                                    ),
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === "description" && (
                                <div className="flex flex-col gap-3">
                                    <h2 className="text-[18px] font-bold text-text-primary m-0">
                                        Description
                                    </h2>
                                    <p className="text-[14px] text-text-secondary leading-relaxed m-0">
                                        {description}
                                    </p>
                                    <p className="text-[14px] text-text-secondary leading-relaxed m-0">
                                        Built for everyday multitasking, this
                                        product combines a bright display,
                                        responsive performance, and practical
                                        connectivity so you can work, stream,
                                        and browse with confidence. Expandable
                                        storage and long battery life make it a
                                        dependable companion at home or on the
                                        go.
                                    </p>
                                </div>
                            )}

                            {activeTab === "qa" && (
                                <div className="flex flex-col gap-5">
                                    <h2 className="text-[18px] font-bold text-text-primary m-0">
                                        Questions &amp; Answers
                                    </h2>
                                    {PRODUCT_QUESTIONS.map((item) => (
                                        <article
                                            key={item.id}
                                            className="border-b border-border-default pb-4 last:border-0 last:pb-0"
                                        >
                                            <h3 className="text-[14px] font-semibold text-text-primary m-0 mb-1.5">
                                                Q: {item.question}
                                            </h3>
                                            <p className="text-[13px] text-text-secondary leading-relaxed m-0 mb-2">
                                                A: {item.answer}
                                            </p>
                                            <p className="text-[12px] text-text-secondary m-0">
                                                {item.author} · {item.date}
                                            </p>
                                        </article>
                                    ))}
                                </div>
                            )}

                            {activeTab === "review" && (
                                <div className="flex flex-col gap-5">
                                    <h2 className="text-[18px] font-bold text-text-primary m-0">
                                        Customer Reviews
                                    </h2>
                                    {PRODUCT_REVIEWS.map((review) => (
                                        <article
                                            key={review.id}
                                            className="border-b border-border-default pb-4 last:border-0 last:pb-0"
                                        >
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <span className="text-[14px] font-semibold text-text-primary">
                                                    {review.author}
                                                </span>
                                                <StarRating
                                                    rating={review.rating}
                                                    showCount={false}
                                                />
                                            </div>
                                            <p className="text-[13px] text-text-secondary leading-relaxed m-0 mb-1.5">
                                                {review.comment}
                                            </p>
                                            <p className="text-[12px] text-text-secondary m-0">
                                                {review.date}
                                            </p>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Related Products */}
                    <aside className="lg:col-span-4 xl:col-span-3">
                        <div className="rounded-lg border border-border-default bg-bg-surface p-4 sm:p-5 sticky top-28">
                            <div className="flex items-center justify-between gap-2 mb-4">
                                <h2 className="text-[16px] font-bold text-text-primary m-0">
                                    Related Products
                                </h2>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        aria-label="Previous related products"
                                        disabled={!canPrevRelated}
                                        onClick={() =>
                                            setRelatedIndex((i) =>
                                                Math.max(0, i - 1),
                                            )
                                        }
                                        className="h-7 w-7 rounded border border-border-default text-text-secondary hover:text-brand-primary hover:border-brand-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
                                    >
                                        ‹
                                    </button>
                                    <button
                                        type="button"
                                        aria-label="Next related products"
                                        disabled={!canNextRelated}
                                        onClick={() =>
                                            setRelatedIndex((i) =>
                                                Math.min(
                                                    Math.max(
                                                        0,
                                                        relatedProducts.length -
                                                            3,
                                                    ),
                                                    i + 1,
                                                ),
                                            )
                                        }
                                        className="h-7 w-7 rounded border border-border-default text-text-secondary hover:text-brand-primary hover:border-brand-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
                                    >
                                        ›
                                    </button>
                                </div>
                            </div>

                            <ul className="flex flex-col gap-4 list-none m-0 p-0">
                                {visibleRelated.map((item) => (
                                    <li key={item.id}>
                                        <Link
                                            href={`/shop/${item.id}`}
                                            className="flex gap-3 group"
                                        >
                                            <div className="relative h-[72px] w-[72px] rounded-md border border-border-default bg-bg-subtle overflow-hidden shrink-0">
                                                <Image
                                                    src={item.image}
                                                    alt={item.alt}
                                                    fill
                                                    sizes="72px"
                                                    className="object-contain p-1.5"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1 min-w-0">
                                                <span className="text-[13px] text-text-primary leading-snug line-clamp-2 group-hover:text-brand-primary transition-colors">
                                                    {item.name}
                                                </span>
                                                <span className="flex items-baseline gap-2">
                                                    <span className="text-[14px] font-semibold text-brand-primary">
                                                        {formatPrice(
                                                            item.priceMin,
                                                        )}
                                                    </span>
                                                    <span className="text-[12px] text-text-secondary line-through">
                                                        {formatPrice(
                                                            item.priceMax,
                                                        )}
                                                    </span>
                                                </span>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </aside>
                </div>
            </div>

            {/* Back to top */}
            {showBackToTop && (
                <button
                    type="button"
                    aria-label="Back to top"
                    onClick={() =>
                        window.scrollTo({ top: 0, behavior: "smooth" })
                    }
                    className="fixed bottom-6 right-5 z-40 h-11 w-11 rounded-full bg-brand-primary hover:bg-brand-hover text-white shadow-lg cursor-pointer flex items-center justify-center transition-colors"
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        aria-hidden="true"
                    >
                        <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                </button>
            )}
        </div>
    );
}

function FragmentSpecSection({
    title,
    rows,
}: {
    title: string;
    rows: { label: string; value: string }[];
}) {
    return (
        <>
            <tr>
                <td
                    colSpan={2}
                    className="bg-brand-tint text-brand-deep dark:text-brand-primary font-semibold px-3 sm:px-4 py-2.5 border border-border-default"
                >
                    {title}
                </td>
            </tr>
            {rows.map((row) => (
                <tr key={`${title}-${row.label}`}>
                    <td className="w-[42%] sm:w-[38%] bg-bg-subtle text-text-secondary px-3 sm:px-4 py-2.5 border border-border-default align-top">
                        {row.label}
                    </td>
                    <td className="text-text-primary px-3 sm:px-4 py-2.5 border border-border-default">
                        {row.value}
                    </td>
                </tr>
            ))}
        </>
    );
}
