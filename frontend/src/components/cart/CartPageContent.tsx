"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
    applyCoupon,
    clearCoupon,
    decrementQuantity,
    incrementQuantity,
    removeFromCart,
    selectCartDiscount,
    selectCartItems,
    selectCartSubtotal,
    selectCartTotal,
    selectCouponCode,
} from "@/store/cartSlice";

function formatPrice(value: number) {
    return value.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
    });
}

function CartBreadcrumb() {
    return (
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
                        <span
                            aria-current="page"
                            className="text-text-primary font-medium"
                        >
                            Cart
                        </span>
                    </li>
                </ol>
            </div>
        </nav>
    );
}

function RemoveIcon() {
    return (
        <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M9 3L3 9M3 3l6 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
        </svg>
    );
}

export default function CartPageContent() {
    const dispatch = useAppDispatch();
    const items = useAppSelector(selectCartItems);
    const subtotal = useAppSelector(selectCartSubtotal);
    const discount = useAppSelector(selectCartDiscount);
    const total = useAppSelector(selectCartTotal);
    const appliedCoupon = useAppSelector(selectCouponCode);
    const [couponInput, setCouponInput] = useState(appliedCoupon ?? "");
    const [couponMessage, setCouponMessage] = useState<string | null>(null);

    const handleApplyCoupon = () => {
        const code = couponInput.trim();
        if (!code) {
            dispatch(clearCoupon());
            setCouponMessage(null);
            return;
        }
        dispatch(applyCoupon(code));
        const upper = code.toUpperCase();
        if (upper === "SAVE10" || upper === "SAVE20") {
            setCouponMessage(
                upper === "SAVE10"
                    ? "Coupon applied: 10% off"
                    : "Coupon applied: 20% off",
            );
        } else {
            setCouponMessage("Invalid coupon code. Try SAVE10 or SAVE20.");
        }
    };

    return (
        <div className="w-full bg-bg-base">
            <CartBreadcrumb />

            <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-10 lg:py-12">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                        <p className="text-[18px] font-semibold text-text-primary m-0">
                            Your cart is empty
                        </p>
                        <p className="text-[14px] text-text-secondary m-0 max-w-md">
                            Looks like you haven&apos;t added anything yet.
                            Browse the shop and find something you like.
                        </p>
                        <Link
                            href="/shop"
                            className="mt-2 h-11 px-6 inline-flex items-center justify-center rounded-md bg-brand-primary hover:bg-brand-hover text-white text-[14px] font-semibold transition-colors"
                        >
                            Return to Shop
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6 lg:gap-8">
                        {/* Cart table */}
                        <div className="border border-border-default rounded-lg overflow-hidden bg-bg-surface">
                            {/* Desktop header */}
                            <div className="hidden md:grid grid-cols-[40px_minmax(0,1.5fr)_110px_150px_110px] gap-4 px-5 py-3.5 border-b border-border-default bg-bg-subtle/80 text-[13px] font-semibold text-text-primary">
                                <span className="sr-only">Remove</span>
                                <span>Product</span>
                                <span className="text-center">Price</span>
                                <span className="text-center">Quantity</span>
                                <span className="text-right">Total</span>
                            </div>

                            <ul className="list-none m-0 p-0 divide-y divide-border-default">
                                {items.map((item) => {
                                    const lineTotal =
                                        item.price * item.quantity;
                                    const productHref =
                                        item.id >= 100
                                            ? "/shop"
                                            : `/shop/${item.id}`;
                                    return (
                                        <li
                                            key={item.id}
                                            className="px-4 sm:px-5 py-4 sm:py-5"
                                        >
                                            <div className="grid grid-cols-[32px_minmax(0,1fr)] md:grid-cols-[40px_minmax(0,1.5fr)_110px_150px_110px] gap-3 md:gap-4 items-center">
                                                <button
                                                    type="button"
                                                    aria-label={`Remove ${item.name} from cart`}
                                                    onClick={() =>
                                                        dispatch(
                                                            removeFromCart(
                                                                item.id,
                                                            ),
                                                        )
                                                    }
                                                    className="h-7 w-7 rounded-full border border-border-default text-text-secondary hover:text-error hover:border-error flex items-center justify-center cursor-pointer transition-colors shrink-0 self-start md:self-center mt-1 md:mt-0"
                                                >
                                                    <RemoveIcon />
                                                </button>

                                                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                                    <Link
                                                        href={productHref}
                                                        className="relative h-14 w-14 sm:h-16 sm:w-16 md:h-[72px] md:w-[72px] rounded border border-border-default bg-bg-subtle overflow-hidden shrink-0"
                                                    >
                                                        <Image
                                                            src={item.image}
                                                            alt={item.alt}
                                                            fill
                                                            sizes="72px"
                                                            className="object-contain p-1.5"
                                                        />
                                                    </Link>
                                                    <Link
                                                        href={productHref}
                                                        className="text-[13px] sm:text-[14px] font-medium text-text-primary hover:text-brand-primary transition-colors leading-snug line-clamp-2"
                                                    >
                                                        {item.name}
                                                    </Link>
                                                </div>

                                                <div className="col-span-2 md:col-span-1 md:contents flex flex-wrap items-center gap-x-4 gap-y-2 pl-10 md:pl-0">
                                                    <p className="text-[13px] sm:text-[14px] text-text-primary m-0 md:text-center tabular-nums">
                                                        <span className="md:hidden text-text-secondary mr-1">
                                                            Price:
                                                        </span>
                                                        {formatPrice(item.price)}
                                                    </p>

                                                    <div className="inline-flex items-center border border-border-default rounded-md bg-bg-base overflow-hidden md:justify-self-center">
                                                        <button
                                                            type="button"
                                                            aria-label={`Decrease quantity of ${item.name}`}
                                                            onClick={() =>
                                                                dispatch(
                                                                    decrementQuantity(
                                                                        item.id,
                                                                    ),
                                                                )
                                                            }
                                                            className="h-9 w-9 text-text-primary hover:bg-bg-subtle cursor-pointer transition-colors text-[16px] leading-none"
                                                        >
                                                            −
                                                        </button>
                                                        <span className="min-w-9 text-center text-[14px] font-medium text-text-primary tabular-nums">
                                                            {item.quantity}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            aria-label={`Increase quantity of ${item.name}`}
                                                            onClick={() =>
                                                                dispatch(
                                                                    incrementQuantity(
                                                                        item.id,
                                                                    ),
                                                                )
                                                            }
                                                            className="h-9 w-9 text-text-primary hover:bg-bg-subtle cursor-pointer transition-colors text-[16px] leading-none"
                                                        >
                                                            +
                                                        </button>
                                                    </div>

                                                    <p className="text-[13px] sm:text-[14px] font-semibold text-text-primary m-0 md:text-right tabular-nums">
                                                        <span className="md:hidden text-text-secondary font-normal mr-1">
                                                            Total:
                                                        </span>
                                                        {formatPrice(lineTotal)}
                                                    </p>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>

                            {/* Coupon row */}
                            <div className="border-t border-border-default px-4 sm:px-5 py-4 sm:py-5">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2.5">
                                    <input
                                        type="text"
                                        value={couponInput}
                                        onChange={(e) => {
                                            setCouponInput(e.target.value);
                                            setCouponMessage(null);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                handleApplyCoupon();
                                            }
                                        }}
                                        placeholder="Coupon Code"
                                        aria-label="Coupon code"
                                        className="h-11 w-full sm:w-56 px-3.5 rounded-md border border-border-default bg-bg-base text-[14px] text-text-primary placeholder:text-text-secondary outline-none focus:border-brand-primary transition-colors"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleApplyCoupon}
                                        className="h-11 px-5 shrink-0 rounded-md bg-brand-primary hover:bg-brand-hover text-white text-[14px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
                                    >
                                        Apply Coupon
                                    </button>
                                </div>
                                {couponMessage && (
                                    <p
                                        className={`mt-2 text-[12px] m-0 sm:text-right ${
                                            appliedCoupon
                                                ? "text-brand-primary"
                                                : "text-error"
                                        }`}
                                        aria-live="polite"
                                    >
                                        {couponMessage}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Cart totals */}
                        <div className="flex justify-end">
                            <div className="w-full max-w-[424px] border border-border-default rounded-lg bg-bg-surface overflow-hidden">
                                <div className="px-5 py-4 border-b border-border-default">
                                    <h2 className="text-[18px] font-semibold text-text-primary m-0">
                                        Cart Totals
                                    </h2>
                                </div>

                                <div className="px-5 py-1">
                                    <div className="flex items-center justify-between py-3.5 border-b border-border-default">
                                        <span className="text-[14px] text-text-primary">
                                            Subtotal
                                        </span>
                                        <span className="text-[14px] font-medium text-text-primary tabular-nums">
                                            {formatPrice(subtotal)}
                                        </span>
                                    </div>

                                    {discount > 0 && (
                                        <div className="flex items-center justify-between py-3.5 border-b border-border-default">
                                            <span className="text-[14px] text-text-primary">
                                                Discount
                                                {appliedCoupon
                                                    ? ` (${appliedCoupon})`
                                                    : ""}
                                            </span>
                                            <span className="text-[14px] font-medium text-brand-primary tabular-nums">
                                                −{formatPrice(discount)}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex items-start justify-between py-3.5 border-b border-border-default gap-4">
                                        <span className="text-[14px] text-text-primary pt-0.5">
                                            Shipping
                                        </span>
                                        <div className="text-right">
                                            <p className="text-[14px] font-medium text-text-primary m-0">
                                                Free Shipping
                                            </p>
                                            <button
                                                type="button"
                                                className="mt-1 text-[13px] text-info hover:underline cursor-pointer bg-transparent border-0 p-0"
                                            >
                                                Calculate Shipping
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between py-4">
                                        <span className="text-[15px] font-semibold text-text-primary">
                                            Total
                                        </span>
                                        <span className="text-[16px] font-bold text-text-primary tabular-nums">
                                            {formatPrice(total)}
                                        </span>
                                    </div>
                                </div>

                                <div className="px-5 pb-5">
                                    <Link
                                        href="/checkout"
                                        className="w-full h-12 inline-flex items-center justify-center rounded-md bg-brand-primary hover:bg-brand-hover text-white text-[15px] font-semibold transition-colors"
                                    >
                                        Checkout
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
