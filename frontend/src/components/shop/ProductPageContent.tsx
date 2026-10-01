"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    DEFAULT_PRODUCT_SPECS,
    PRODUCT_QUESTIONS,
    SHOP_BRANDS,
    SHOP_CATEGORIES,
    getProductGallery,
    getRelatedProducts,
} from "./data";
import type { ProductTabId, ShopProduct } from "./types";
import { useAppDispatch } from "@/store/hooks";
import { addCartItem, buyNow, cartSnapshot } from "@/store/cartSlice";
import WishlistToggleButton from "./WishlistToggleButton";
import { ProductImageZoom } from "./ProductImageZoom";
import ProductShare from "./ProductShare";
import { formatPrice, formatPriceRange } from "@/lib/money";
import { EMPTY_REVIEWS, type ReviewsPayload } from "@/lib/reviews";
import ProductReviews from "@/components/reviews/ProductReviews";
import { StarIcon } from "@/components/reviews/ReviewStars";

interface ProductPageContentProps {
    product: ShopProduct;
    relatedProducts?: ShopProduct[];
    store?: { name: string; slug: string } | null;
    /** Canonical absolute product URL. */
    shareUrl?: string;
    inStock?: boolean;
    /** Approved reviews, rendered on the server. */
    reviews?: ReviewsPayload | null;
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
    const remote = /^https?:\/\//i.test(src);
    if (remote) {
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

const TABS: { id: ProductTabId; label: string }[] = [
    { id: "specification", label: "Specification" },
    { id: "description", label: "Description" },
    { id: "qa", label: "Q&A" },
    { id: "review", label: "Review" },
];

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
            <div className="flex items-center gap-0.5" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((star) => (
                    <StarIcon key={star} fill={rating - (star - 1)} />
                ))}
            </div>
            {showCount && reviewCount != null && (
                <a
                    href="#product-review"
                    className="text-[13px] text-text-secondary hover:text-brand-primary"
                >
                    ({reviewCount}) Review
                </a>
            )}
        </div>
    );
}

function BoltIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
        </svg>
    );
}

const SECTION_GAP = 12;

function stickyOffset(nav: HTMLElement | null) {
    const header = document.querySelector<HTMLElement>("header[role='banner']");
    return (header?.offsetHeight ?? 0) + (nav?.offsetHeight ?? 0) + SECTION_GAP;
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

export default function ProductPageContent({
    product,
    relatedProducts: relatedFromApi,
    store = null,
    shareUrl,
    inStock = product.available > 0,
    reviews = null,
}: ProductPageContentProps) {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const gallery = useMemo(() => getProductGallery(product), [product]);
    const relatedProducts = useMemo(
        () =>
            relatedFromApi && relatedFromApi.length > 0
                ? relatedFromApi
                : getRelatedProducts(product, 4),
        [product, relatedFromApi],
    );

    const [activeImage, setActiveImage] = useState(gallery[0]);
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState<ProductTabId>("specification");
    const [relatedIndex, setRelatedIndex] = useState(0);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [buying, setBuying] = useState(false);
    const [headerHeight, setHeaderHeight] = useState(0);

    const navRef = useRef<HTMLElement>(null);
    const sectionRefs = useRef<Record<ProductTabId, HTMLElement | null>>({
        specification: null,
        description: null,
        qa: null,
        review: null,
    });
    /** Ignore scroll-spy while a tab click is smooth-scrolling. */
    const spyPausedUntil = useRef(0);

    const handleAddToCart = () => {
        void dispatch(
            addCartItem({ productId: product.id, quantity, product: cartSnapshot(product) }),
        );
    };

    const handleBuyNow = async () => {
        setBuying(true);
        // Buy now checks out exactly the chosen quantity instead of adding to what's already in the cart.
        const result = await dispatch(
            buyNow({ productId: product.id, quantity, exact: true, product: cartSnapshot(product) }),
        );
        if (result.meta.requestStatus === "fulfilled") router.push("/checkout");
        else setBuying(false);
    };

    const scrollToSection = useCallback((id: ProductTabId) => {
        const el = sectionRefs.current[id];
        if (!el) return;
        setActiveTab(id);
        spyPausedUntil.current = Date.now() + 900;
        const top =
            el.getBoundingClientRect().top +
            window.scrollY -
            stickyOffset(navRef.current);
        window.scrollTo({ top, behavior: "smooth" });
    }, []);

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
        const onScroll = () => {
            setShowBackToTop(window.scrollY > 420);
            if (Date.now() < spyPausedUntil.current) return;
            const line = stickyOffset(navRef.current) + 1;
            let current: ProductTabId = TABS[0].id;
            for (const tab of TABS) {
                const el = sectionRefs.current[tab.id];
                if (el && el.getBoundingClientRect().top <= line) current = tab.id;
            }
            setActiveTab(current);
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        const header = document.querySelector<HTMLElement>("header[role='banner']");
        if (!header) return;
        const update = () => setHeaderHeight(header.offsetHeight);
        update();
        const observer = new ResizeObserver(update);
        observer.observe(header);
        return () => observer.disconnect();
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
                    <ol className="flex flex-wrap items-center gap-2 text-[13px] list-none m-0 p-0">
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
                                className="text-text-secondary hover:text-brand-primary transition-colors"
                            >
                                Shop
                            </Link>
                        </li>
                        {store ? (
                            <>
                                <li
                                    aria-hidden="true"
                                    className="text-text-secondary"
                                >
                                    &gt;
                                </li>
                                <li>
                                    <Link
                                        href={`/stores/${store.slug}`}
                                        className="text-text-secondary hover:text-brand-primary transition-colors"
                                    >
                                        {store.name}
                                    </Link>
                                </li>
                            </>
                        ) : null}
                        <li aria-hidden="true" className="text-text-secondary">
                            &gt;
                        </li>
                        <li
                            aria-current="page"
                            className="text-brand-primary font-medium truncate max-w-[60vw] sm:max-w-md"
                        >
                            {product.name}
                        </li>
                    </ol>
                </div>
            </nav>

            <article
                aria-labelledby="product-title"
                className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-10"
            >
                {/* Top: gallery + details */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10">
                    {/* Gallery: main + vertical thumbs */}
                    <section
                        aria-label={`${product.name} images`}
                        className="lg:col-span-5 flex flex-col sm:flex-row gap-3 sm:gap-4"
                    >
                        <ProductImageZoom
                            images={gallery}
                            activeIndex={Math.max(0, gallery.indexOf(activeImage))}
                            alt={product.alt}
                            onIndexChange={(index) => setActiveImage(gallery[index])}
                        >
                            <ProductImage
                                src={activeImage}
                                alt={product.alt}
                                fill
                                sizes="(max-width: 1024px) 100vw, 420px"
                                className="object-contain p-5 sm:p-8"
                                priority
                            />
                        </ProductImageZoom>

                        <ul
                            aria-label="Image thumbnails"
                            className="flex sm:flex-col gap-2.5 shrink-0 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 list-none m-0 p-0"
                        >
                            {gallery.map((src, index) => {
                                const isActive = src === activeImage;
                                return (
                                    <li key={`${src}-${index}`} className="shrink-0">
                                    <button
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
                                        <ProductImage
                                            src={src}
                                            alt=""
                                            fill
                                            sizes="76px"
                                            className="object-contain p-1.5"
                                            aria-hidden
                                        />
                                    </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>

                    {/* Details */}
                    <section
                        aria-labelledby="product-title"
                        className="lg:col-span-7 flex flex-col gap-3.5"
                    >
                        <header className="flex flex-col gap-3.5">
                            <h1
                                id="product-title"
                                className="text-[22px] sm:text-[26px] lg:text-[28px] font-bold text-text-primary leading-snug m-0"
                            >
                                {product.name}
                            </h1>

                            <StarRating
                                rating={product.rating}
                                reviewCount={product.reviewCount}
                            />

                            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 m-0">
                                <data
                                    value={product.priceMin}
                                    className="text-[22px] sm:text-[24px] font-bold text-brand-primary"
                                >
                                    {formatPriceRange(product.priceMin, product.priceMax)}
                                </data>
                                <span
                                    className={`text-[13px] font-medium ${
                                        inStock ? "text-brand-primary" : "text-error"
                                    }`}
                                >
                                    {inStock ? "In stock" : "Out of stock"}
                                </span>
                            </p>
                        </header>

                        <p className="text-[14px] text-text-secondary leading-relaxed m-0 max-w-2xl">
                            {description}
                        </p>

                        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1.5 text-[13px] m-0">
                            <dt className="text-text-secondary">Product id:</dt>
                            <dd className="m-0 text-text-primary">{sku}</dd>
                            <dt className="text-text-secondary">Model:</dt>
                            <dd className="m-0 text-text-primary">{model}</dd>
                            <dt className="text-text-secondary">Categories:</dt>
                            <dd className="m-0 text-text-primary">{categories}</dd>
                        </dl>

                        {tags.length > 0 ? (
                            <ul
                                aria-label="Tags"
                                className="flex flex-wrap gap-2 pt-0.5 list-none m-0 p-0"
                            >
                                {tags.map((tag) => (
                                    <li
                                        key={tag}
                                        className="text-[12px] px-3 py-1.5 rounded bg-bg-subtle border border-border-default text-text-secondary"
                                    >
                                        {tag}
                                    </li>
                                ))}
                            </ul>
                        ) : null}

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
                                className="h-11 px-6 rounded-md bg-brand-primary hover:bg-brand-hover text-white text-[14px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-2"
                            >
                                <CartIcon />
                                Add to Cart
                            </button>

                            <button
                                type="button"
                                onClick={handleBuyNow}
                                disabled={buying}
                                className="h-11 px-6 rounded-md bg-warning hover:brightness-95 disabled:opacity-70 text-white text-[14px] font-semibold transition cursor-pointer inline-flex items-center gap-2"
                            >
                                <BoltIcon />
                                {buying ? "Going to checkout…" : "Buy Now"}
                            </button>

                            <button
                                type="button"
                                className="h-11 px-5 rounded-md border border-border-default bg-bg-subtle text-text-primary text-[14px] font-medium hover:border-brand-primary hover:text-brand-primary transition-colors cursor-pointer"
                            >
                                Compare
                            </button>

                            <WishlistToggleButton productId={product.id} />
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

                        <ProductShare
                            url={shareUrl ?? `/shop/${product.slug}`}
                            title={product.name}
                            image={product.image}
                        />
                    </section>
                </div>

                {/* Tabs + Related */}
                <div className="mt-10 lg:mt-14 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                    <div className="lg:col-span-8 xl:col-span-9">
                        <nav
                            ref={navRef}
                            aria-label="Product information"
                            style={{ top: headerHeight }}
                            className="sticky z-30 -mx-1 mb-5 bg-bg-base/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-bg-base/80"
                        >
                            <div className="flex gap-2 sm:gap-3 overflow-x-auto">
                                {TABS.map((tab) => {
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <a
                                            key={tab.id}
                                            href={`#product-${tab.id}`}
                                            aria-current={isActive ? "true" : undefined}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                scrollToSection(tab.id);
                                            }}
                                            className={`h-10 shrink-0 px-4 sm:px-5 inline-flex items-center rounded-md text-[13px] sm:text-[14px] font-medium transition-colors border ${
                                                isActive
                                                    ? "bg-brand-primary border-brand-primary text-white"
                                                    : "bg-bg-subtle border-border-default text-text-secondary hover:border-brand-primary hover:text-brand-primary"
                                            }`}
                                        >
                                            {tab.label}
                                        </a>
                                    );
                                })}
                            </div>
                        </nav>

                        <div className="flex flex-col gap-5">
                            <section
                                id="product-specification"
                                ref={(el) => {
                                    sectionRefs.current.specification = el;
                                }}
                                aria-labelledby="product-specification-title"
                                className="rounded-lg border border-border-default bg-bg-surface p-4 sm:p-6"
                            >
                                <div>
                                    <h2
                                        id="product-specification-title"
                                        className="text-[18px] font-bold text-text-primary m-0 mb-4"
                                    >
                                        Specification
                                    </h2>
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse text-[13px] sm:text-[14px]">
                                            <caption className="sr-only">
                                                {product.name} specifications
                                            </caption>
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
                            </section>

                            <section
                                id="product-description"
                                ref={(el) => {
                                    sectionRefs.current.description = el;
                                }}
                                aria-labelledby="product-description-title"
                                className="rounded-lg border border-border-default bg-bg-surface p-4 sm:p-6"
                            >
                                <div className="flex flex-col gap-3">
                                    <h2
                                        id="product-description-title"
                                        className="text-[18px] font-bold text-text-primary m-0"
                                    >
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
                            </section>

                            <section
                                id="product-qa"
                                ref={(el) => {
                                    sectionRefs.current.qa = el;
                                }}
                                aria-labelledby="product-qa-title"
                                className="rounded-lg border border-border-default bg-bg-surface p-4 sm:p-6"
                            >
                                <div className="flex flex-col gap-5">
                                    <h2
                                        id="product-qa-title"
                                        className="text-[18px] font-bold text-text-primary m-0"
                                    >
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
                                            <footer className="text-[12px] text-text-secondary">
                                                {item.author} · {item.date}
                                            </footer>
                                        </article>
                                    ))}
                                </div>
                            </section>

                            <section
                                id="product-review"
                                ref={(el) => {
                                    sectionRefs.current.review = el;
                                }}
                                aria-labelledby="product-review-title"
                                className="rounded-lg border border-border-default bg-bg-surface p-4 sm:p-6"
                            >
                                <ProductReviews
                                    titleId="product-review-title"
                                    productSlug={product.slug}
                                    productName={product.name}
                                    storeName={store?.name}
                                    initial={reviews ?? EMPTY_REVIEWS}
                                />
                            </section>
                        </div>
                    </div>

                    {/* Related Products */}
                    <aside
                        aria-labelledby="related-products-title"
                        className="lg:col-span-4 xl:col-span-3"
                    >
                        <div
                            style={{ top: headerHeight + 16 }}
                            className="rounded-lg border border-border-default bg-bg-surface p-4 sm:p-5 sticky"
                        >
                            <div className="flex items-center justify-between gap-2 mb-4">
                                <h2
                                    id="related-products-title"
                                    className="text-[16px] font-bold text-text-primary m-0"
                                >
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
                                            href={`/shop/${item.slug}`}
                                            className="flex gap-3 group"
                                        >
                                            <div className="relative h-[72px] w-[72px] rounded-md border border-border-default bg-bg-subtle overflow-hidden shrink-0">
                                                <ProductImage
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
            </article>

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
                <th
                    colSpan={2}
                    scope="colgroup"
                    className="bg-brand-tint text-brand-deep dark:text-brand-primary font-semibold text-left px-3 sm:px-4 py-2.5 border border-border-default"
                >
                    {title}
                </th>
            </tr>
            {rows.map((row) => (
                <tr key={`${title}-${row.label}`}>
                    <th
                        scope="row"
                        className="w-[42%] sm:w-[38%] bg-bg-subtle text-text-secondary font-normal text-left px-3 sm:px-4 py-2.5 border border-border-default align-top"
                    >
                        {row.label}
                    </th>
                    <td className="text-text-primary px-3 sm:px-4 py-2.5 border border-border-default">
                        {row.value}
                    </td>
                </tr>
            ))}
        </>
    );
}
