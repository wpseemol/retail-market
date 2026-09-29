"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ApiError, apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/money";
import { toShopProduct, type ApiProduct } from "@/lib/products";
import { useWishlist } from "@/hooks/useWishlist";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addToCart } from "@/store/cartSlice";
import { selectWishlistIds, selectWishlistLoaded } from "@/store/wishlistSlice";
import type { ShopProduct } from "@/components/shop/types";

type WishlistResponse = {
    items: { added_at: string; product: ApiProduct }[];
    count: number;
};

type WishlistRow = { addedAt: string; product: ShopProduct; comparePrice: number | null };

/** Rows on success, or an error message. */
async function fetchWishlistRows(): Promise<WishlistRow[] | string> {
    try {
        const data = await apiFetch<WishlistResponse>("/api/customer/wishlist");
        return data.items.map((item) => ({
            addedAt: item.added_at,
            product: toShopProduct(item.product),
            comparePrice:
                item.product.compare_at_price &&
                Number(item.product.compare_at_price) > Number(item.product.price)
                    ? Number(item.product.compare_at_price)
                    : null,
        }));
    } catch (err) {
        return err instanceof ApiError ? err.message : "Could not load your wishlist.";
    }
}

function Breadcrumb() {
    return (
        <nav aria-label="Breadcrumb" className="w-full border-b border-border-default bg-bg-subtle/60">
            <div className="container mx-auto px-4 sm:px-6 py-3.5">
                <ol className="flex items-center gap-2 text-[13px] list-none m-0 p-0">
                    <li>
                        <Link href="/" className="text-text-secondary hover:text-brand-primary transition-colors">
                            Home
                        </Link>
                    </li>
                    <li aria-hidden="true" className="text-text-secondary">
                        &gt;
                    </li>
                    <li>
                        <span aria-current="page" className="text-text-primary font-medium">
                            Wishlist
                        </span>
                    </li>
                </ol>
            </div>
        </nav>
    );
}

function formatAdded(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function WishlistPageContent() {
    const dispatch = useAppDispatch();
    const wishlistIds = useAppSelector(selectWishlistIds);
    const wishlistLoaded = useAppSelector(selectWishlistLoaded);
    const { toggle, isPending, error: toggleError } = useWishlist();
    const [rows, setRows] = useState<WishlistRow[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [addedId, setAddedId] = useState<number | null>(null);

    const applyResult = useCallback((result: WishlistRow[] | string) => {
        if (typeof result === "string") {
            setLoadError(result);
            setRows([]);
        } else {
            setLoadError(null);
            setRows(result);
        }
    }, []);

    const load = useCallback(async () => {
        applyResult(await fetchWishlistRows());
    }, [applyResult]);

    useEffect(() => {
        let cancelled = false;
        void fetchWishlistRows().then((result) => {
            if (!cancelled) applyResult(result);
        });
        return () => {
            cancelled = true;
        };
    }, [applyResult]);

    const visibleRows =
        rows && wishlistLoaded
            ? rows.filter((row) => wishlistIds.includes(row.product.id))
            : rows;

    const handleAddToCart = (product: ShopProduct) => {
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
        setAddedId(product.id);
        window.setTimeout(() => setAddedId((cur) => (cur === product.id ? null : cur)), 1600);
    };

    const handleAddAll = () => {
        visibleRows
            ?.filter((row) => row.product.available > 0)
            .forEach((row) => handleAddToCart(row.product));
    };

    return (
        <div className="w-full bg-bg-base">
            <Breadcrumb />

            <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-10 lg:py-12">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="m-0 text-[24px] sm:text-[28px] font-bold text-text-primary">
                            My Wishlist
                        </h1>
                        {visibleRows ? (
                            <p className="mt-1 mb-0 text-[14px] text-text-secondary">
                                {visibleRows.length} {visibleRows.length === 1 ? "product" : "products"} saved
                            </p>
                        ) : null}
                    </div>
                    {visibleRows && visibleRows.some((row) => row.product.available > 0) ? (
                        <button
                            type="button"
                            onClick={handleAddAll}
                            className="h-10 px-5 rounded-md border border-brand-primary text-brand-primary text-[14px] font-semibold hover:bg-brand-primary hover:text-white transition-colors cursor-pointer"
                        >
                            Add all in stock to cart
                        </button>
                    ) : null}
                </div>

                {loadError ? (
                    <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-[14px] text-error">
                        <span>{loadError}</span>
                        <button type="button" onClick={() => void load()} className="font-semibold underline cursor-pointer">
                            Try again
                        </button>
                    </div>
                ) : null}
                {toggleError ? (
                    <p role="alert" className="mb-4 mt-0 text-[13px] text-error">
                        {toggleError}
                    </p>
                ) : null}

                {visibleRows === null ? (
                    <ul className="list-none m-0 p-0 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <li key={i} className="h-80 rounded-lg border border-border-default bg-bg-subtle animate-pulse" />
                        ))}
                    </ul>
                ) : visibleRows.length === 0 && !loadError ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                        <span className="flex size-16 items-center justify-center rounded-full bg-brand-tint text-brand-primary" aria-hidden="true">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                        </span>
                        <p className="text-[18px] font-semibold text-text-primary m-0">Your wishlist is empty</p>
                        <p className="text-[14px] text-text-secondary m-0 max-w-md">
                            Tap the heart on any product to save it here for later.
                        </p>
                        <Link
                            href="/shop"
                            className="mt-2 h-11 px-6 inline-flex items-center justify-center rounded-md bg-brand-primary hover:bg-brand-hover text-white text-[14px] font-semibold transition-colors"
                        >
                            Browse the Shop
                        </Link>
                    </div>
                ) : (
                    <ul className="list-none m-0 p-0 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {visibleRows.map(({ product, addedAt, comparePrice }) => {
                            const inStock = product.available > 0;
                            const removing = isPending(product.id);
                            const justAdded = addedId === product.id;
                            return (
                                <li
                                    key={product.id}
                                    className={`group relative flex flex-col rounded-lg border border-border-default bg-bg-surface transition-[border-color,box-shadow,opacity] duration-200 hover:border-brand-primary hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] ${
                                        removing ? "opacity-50" : ""
                                    }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => void toggle(product.id)}
                                        disabled={removing}
                                        aria-label={`Remove ${product.name} from wishlist`}
                                        title="Remove from wishlist"
                                        className="absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full border border-border-default bg-bg-surface text-text-secondary shadow-sm transition-colors hover:border-error hover:text-error cursor-pointer disabled:cursor-wait"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                                            <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                        </svg>
                                    </button>

                                    <Link
                                        href={`/shop/${product.slug}`}
                                        className="relative block aspect-square overflow-hidden rounded-t-lg bg-bg-subtle"
                                    >
                                        <Image
                                            src={product.image}
                                            alt={product.alt}
                                            fill
                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                            className="object-contain p-4"
                                        />
                                    </Link>

                                    <div className="flex flex-1 flex-col gap-1.5 px-4 pt-3 pb-4">
                                        <h2 className="m-0 text-[14px] sm:text-[15px] font-medium leading-snug text-text-primary line-clamp-2">
                                            <Link href={`/shop/${product.slug}`} className="hover:text-brand-primary transition-colors">
                                                {product.name}
                                            </Link>
                                        </h2>
                                        <p className="m-0 flex items-baseline gap-2">
                                            <span className="text-[16px] font-semibold text-brand-primary">
                                                {formatPrice(product.priceMin)}
                                            </span>
                                            {comparePrice ? (
                                                <span className="text-[13px] text-text-secondary line-through">
                                                    {formatPrice(comparePrice)}
                                                </span>
                                            ) : null}
                                        </p>
                                        <p className={`m-0 text-[12px] font-medium ${inStock ? "text-brand-primary" : "text-error"}`}>
                                            {inStock ? `In stock (${product.available})` : "Out of stock"}
                                        </p>
                                        {addedAt ? (
                                            <p className="m-0 text-[12px] text-text-secondary">Saved {formatAdded(addedAt)}</p>
                                        ) : null}

                                        <div className="mt-auto pt-3">
                                        <button
                                            type="button"
                                            onClick={() => handleAddToCart(product)}
                                            disabled={!inStock}
                                            className={`h-10 w-full rounded-md text-[13px] font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                                justAdded
                                                    ? "border border-brand-primary bg-brand-primary/15 text-brand-primary"
                                                    : "bg-brand-primary text-white hover:bg-brand-hover"
                                            }`}
                                        >
                                            {!inStock ? "Out of stock" : justAdded ? "Added to cart" : "Add to Cart"}
                                        </button>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
