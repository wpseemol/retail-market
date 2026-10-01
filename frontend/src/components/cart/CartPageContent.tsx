"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    ArrowLeft,
    ArrowRight,
    Lock,
    Minus,
    PackageX,
    Plus,
    RotateCcw,
    ShieldCheck,
    ShoppingBag,
    TicketPercent,
    Trash2,
    Truck,
    X,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
    applyCoupon,
    clearCartError,
    clearCoupon,
    removeCartLines,
    selectCartError,
    selectCartItems,
    selectCartLoaded,
    selectCheckoutDiscount,
    selectCheckoutItems,
    selectCheckoutSubtotal,
    selectCheckoutTotal,
    selectCouponCode,
    setLineQuantity,
    setLineSelected,
    setLinesSelected,
} from "@/store/cartSlice";
import { MAX_LINE_QUANTITY, type CartLine } from "@/lib/cartTypes";
import { formatPrice } from "@/lib/money";
import { useShippingQuote } from "@/hooks/useShippingQuote";
import { ShippingSummaryValue } from "@/components/cart/ShippingSummaryValue";

const FALLBACK_IMAGE = "/images/camera.png";
const LOW_STOCK_AT = 5;

const checkboxClass =
    "size-[18px] shrink-0 rounded border-border-default accent-brand-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-40";

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
                        <span aria-current="page" className="text-text-primary font-medium">
                            Cart
                        </span>
                    </li>
                </ol>
            </div>
        </nav>
    );
}

function QuantityStepper({ item }: { item: CartLine }) {
    const dispatch = useAppDispatch();
    const maxQty = Math.min(MAX_LINE_QUANTITY, Math.max(item.stock_qty, 1));
    const set = (quantity: number) =>
        void dispatch(setLineQuantity({ productId: item.product_id, quantity }));

    return (
        <div className="inline-flex h-9 items-center rounded-full border border-border-default bg-bg-base">
            <button
                type="button"
                aria-label={`Decrease quantity of ${item.name}`}
                disabled={item.quantity <= 1 || !item.available}
                onClick={() => set(item.quantity - 1)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-text-primary hover:bg-bg-subtle cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            >
                <Minus className="size-3.5" aria-hidden="true" />
            </button>
            <span
                aria-live="polite"
                className="min-w-8 text-center text-[14px] font-semibold text-text-primary tabular-nums"
            >
                {item.quantity}
            </span>
            <button
                type="button"
                aria-label={`Increase quantity of ${item.name}`}
                disabled={item.quantity >= maxQty || !item.available}
                onClick={() => set(item.quantity + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-text-primary hover:bg-bg-subtle cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            >
                <Plus className="size-3.5" aria-hidden="true" />
            </button>
        </div>
    );
}

function CartItemCard({ item }: { item: CartLine }) {
    const dispatch = useAppDispatch();
    const productHref = `/shop/${item.slug}`;
    const onSale = item.compare_at_price !== null && item.compare_at_price > item.unit_price;
    const lowStock = item.available && item.stock_qty <= LOW_STOCK_AT;
    const checked = item.available && item.selected;

    return (
        <li
            className={`relative flex gap-3 sm:gap-4 rounded-xl border p-3 sm:p-4 transition-colors ${
                checked
                    ? "border-brand-primary/40 bg-brand-tint/30"
                    : "border-border-default bg-bg-surface"
            } ${item.available ? "" : "opacity-80"}`}
        >
            <input
                type="checkbox"
                checked={checked}
                disabled={!item.available}
                onChange={(e) =>
                    void dispatch(
                        setLineSelected({
                            productId: item.product_id,
                            selected: e.target.checked,
                        }),
                    )
                }
                aria-label={`Select ${item.name} for checkout`}
                className={`${checkboxClass} mt-1`}
            />

            <Link
                href={productHref}
                className="relative size-20 sm:size-24 shrink-0 overflow-hidden rounded-lg border border-border-default bg-bg-base"
            >
                <Image
                    src={item.image || FALLBACK_IMAGE}
                    alt={item.alt}
                    fill
                    sizes="96px"
                    className={`object-contain p-2 ${item.available ? "" : "grayscale"}`}
                />
                {onSale && item.available && (
                    <span className="absolute left-1 top-1 rounded bg-error px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                        -{Math.round((1 - item.unit_price / item.compare_at_price!) * 100)}%
                    </span>
                )}
            </Link>

            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1 pr-7 sm:pr-0">
                    <Link
                        href={productHref}
                        className="line-clamp-2 text-[14px] sm:text-[15px] font-medium leading-snug text-text-primary hover:text-brand-primary transition-colors"
                    >
                        {item.name}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                        <span className="text-[14px] font-semibold text-text-primary tabular-nums">
                            {formatPrice(item.unit_price)}
                        </span>
                        {onSale && (
                            <span className="text-[12px] text-text-secondary line-through tabular-nums">
                                {formatPrice(item.compare_at_price!)}
                            </span>
                        )}
                    </div>
                    {!item.available ? (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-error/10 px-2 py-0.5 text-[11px] font-semibold text-error">
                            <PackageX className="size-3" aria-hidden="true" />
                            Out of stock
                        </span>
                    ) : lowStock ? (
                        <span className="mt-1.5 inline-flex rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
                            Only {item.stock_qty} left
                        </span>
                    ) : null}
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-6">
                    <QuantityStepper item={item} />
                    <p className="m-0 min-w-24 text-right text-[15px] font-bold text-text-primary tabular-nums">
                        {formatPrice(item.unit_price * item.quantity)}
                    </p>
                </div>
            </div>

            <button
                type="button"
                aria-label={`Remove ${item.name} from cart`}
                onClick={() => void dispatch(removeCartLines([item.product_id]))}
                className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full text-text-secondary hover:bg-error/10 hover:text-error cursor-pointer transition-colors sm:static sm:self-center"
            >
                <Trash2 className="size-4" aria-hidden="true" />
            </button>
        </li>
    );
}

function CouponField() {
    const dispatch = useAppDispatch();
    const appliedCoupon = useAppSelector(selectCouponCode);
    const [input, setInput] = useState(appliedCoupon ?? "");
    const [message, setMessage] = useState<string | null>(null);

    const apply = () => {
        const code = input.trim();
        if (!code) {
            dispatch(clearCoupon());
            setMessage(null);
            return;
        }
        dispatch(applyCoupon(code));
        const upper = code.toUpperCase();
        setMessage(
            upper === "SAVE10"
                ? "Coupon applied: 10% off"
                : upper === "SAVE20"
                  ? "Coupon applied: 20% off"
                  : "Invalid coupon code. Try SAVE10 or SAVE20.",
        );
    };

    const remove = () => {
        dispatch(clearCoupon());
        setInput("");
        setMessage(null);
    };

    if (appliedCoupon) {
        return (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-brand-primary/60 bg-brand-tint/40 px-3 py-2.5">
                <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-brand-primary">
                    <TicketPercent className="size-4" aria-hidden="true" />
                    {appliedCoupon}
                </span>
                <button
                    type="button"
                    onClick={remove}
                    aria-label="Remove coupon"
                    className="flex size-7 items-center justify-center rounded-full text-text-secondary hover:bg-bg-subtle hover:text-error cursor-pointer transition-colors"
                >
                    <X className="size-3.5" aria-hidden="true" />
                </button>
            </div>
        );
    }

    return (
        <div>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <TicketPercent
                        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
                        aria-hidden="true"
                    />
                    <input
                        type="text"
                        value={input}
                        maxLength={32}
                        onChange={(e) => {
                            setInput(e.target.value);
                            setMessage(null);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") apply();
                        }}
                        placeholder="Coupon code"
                        aria-label="Coupon code"
                        className="h-10 w-full rounded-lg border border-border-default bg-bg-base pl-9 pr-3 text-[13px] text-text-primary placeholder:text-text-secondary outline-none focus:border-brand-primary transition-colors"
                    />
                </div>
                <button
                    type="button"
                    onClick={apply}
                    className="h-10 shrink-0 rounded-lg border border-brand-primary px-4 text-[13px] font-semibold text-brand-primary hover:bg-brand-primary hover:text-white cursor-pointer transition-colors"
                >
                    Apply
                </button>
            </div>
            {message && (
                <p className="m-0 mt-1.5 text-[12px] text-error" aria-live="polite">
                    {message}
                </p>
            )}
        </div>
    );
}

function SummaryRow({
    label,
    children,
    tone = "default",
}: {
    label: React.ReactNode;
    children: React.ReactNode;
    tone?: "default" | "brand";
}) {
    return (
        <div className="flex items-start justify-between gap-4 py-2">
            <span className="text-[14px] text-text-secondary">{label}</span>
            <div
                className={`text-right text-[14px] font-medium tabular-nums ${
                    tone === "brand" ? "text-brand-primary" : "text-text-primary"
                }`}
            >
                {children}
            </div>
        </div>
    );
}

const TRUST_POINTS = [
    { icon: ShieldCheck, label: "Secure checkout" },
    { icon: Truck, label: "Fast delivery" },
    { icon: RotateCcw, label: "Easy returns" },
] as const;

function OrderSummary({ totalLines }: { totalLines: number }) {
    const checkoutItems = useAppSelector(selectCheckoutItems);
    const subtotal = useAppSelector(selectCheckoutSubtotal);
    const discount = useAppSelector(selectCheckoutDiscount);
    const cartTotal = useAppSelector(selectCheckoutTotal);
    const appliedCoupon = useAppSelector(selectCouponCode);
    const shipping = useShippingQuote(checkoutItems);
    const total = cartTotal + shipping.fee;
    const selectedUnits = checkoutItems.reduce((sum, item) => sum + item.quantity, 0);
    const savings = checkoutItems.reduce(
        (sum, item) =>
            item.compare_at_price && item.compare_at_price > item.unit_price
                ? sum + (item.compare_at_price - item.unit_price) * item.quantity
                : sum,
        0,
    );
    const ready = checkoutItems.length > 0;

    return (
        <aside className="lg:sticky lg:top-24 flex flex-col gap-4">
            <div className="overflow-hidden rounded-xl border border-border-default bg-bg-surface">
                <div className="border-b border-border-default px-5 py-4">
                    <h2 className="m-0 text-[17px] font-semibold text-text-primary">
                        Order Summary
                    </h2>
                    <p className="m-0 mt-0.5 text-[12px] text-text-secondary">
                        {ready
                            ? `${checkoutItems.length} of ${totalLines} product${totalLines === 1 ? "" : "s"} selected`
                            : "Select products to check out"}
                    </p>
                </div>

                <div className="px-5 py-3">
                    <SummaryRow
                        label={`Subtotal (${selectedUnits} item${selectedUnits === 1 ? "" : "s"})`}
                    >
                        {formatPrice(subtotal)}
                    </SummaryRow>
                    {discount > 0 && (
                        <SummaryRow label={`Coupon (${appliedCoupon})`} tone="brand">
                            −{formatPrice(discount)}
                        </SummaryRow>
                    )}
                    <SummaryRow label="Shipping">
                        <ShippingSummaryValue
                            quote={shipping.quote}
                            loading={shipping.loading}
                            error={shipping.error}
                            subtotal={subtotal}
                        />
                    </SummaryRow>
                </div>

                <div className="border-t border-border-default px-5 py-4">
                    <CouponField />
                </div>

                <div className="border-t border-border-default bg-bg-subtle/50 px-5 py-4">
                    <div className="flex items-baseline justify-between">
                        <span className="text-[15px] font-semibold text-text-primary">Total</span>
                        <span className="text-[20px] font-bold text-text-primary tabular-nums">
                            {formatPrice(total)}
                        </span>
                    </div>
                    {savings > 0 && (
                        <p className="m-0 mt-1 text-right text-[12px] font-medium text-brand-primary">
                            You save {formatPrice(savings + discount)}
                        </p>
                    )}

                    {ready ? (
                        <Link
                            href="/checkout"
                            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-primary text-[15px] font-semibold text-white hover:bg-brand-hover transition-colors"
                        >
                            <Lock className="size-4" aria-hidden="true" />
                            Checkout ({checkoutItems.length})
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                    ) : (
                        <button
                            type="button"
                            disabled
                            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-primary text-[15px] font-semibold text-white opacity-50 cursor-not-allowed"
                        >
                            <Lock className="size-4" aria-hidden="true" />
                            Checkout
                        </button>
                    )}
                </div>
            </div>

            <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0">
                {TRUST_POINTS.map(({ icon: Icon, label }) => (
                    <li
                        key={label}
                        className="flex flex-col items-center gap-1.5 rounded-lg border border-border-default bg-bg-surface px-2 py-3 text-center"
                    >
                        <Icon className="size-5 text-brand-primary" aria-hidden="true" />
                        <span className="text-[11px] font-medium leading-tight text-text-secondary">
                            {label}
                        </span>
                    </li>
                ))}
            </ul>
        </aside>
    );
}

function CartSkeleton() {
    return (
        <div
            className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]"
            aria-busy="true"
            aria-label="Loading your cart"
        >
            <div className="flex flex-col gap-3">
                <div className="h-14 rounded-xl border border-border-default bg-bg-subtle/60" />
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className="h-28 rounded-xl border border-border-default bg-bg-subtle/60"
                    />
                ))}
            </div>
            <div className="h-80 rounded-xl border border-border-default bg-bg-subtle/60" />
        </div>
    );
}

function EmptyCart() {
    return (
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-dashed border-border-default bg-bg-surface px-6 py-16 text-center">
            <span className="flex size-20 items-center justify-center rounded-full bg-brand-tint/60 text-brand-primary">
                <ShoppingBag className="size-9" aria-hidden="true" />
            </span>
            <h2 className="m-0 text-[20px] font-semibold text-text-primary">Your cart is empty</h2>
            <p className="m-0 text-[14px] text-text-secondary">
                Looks like you haven&apos;t added anything yet. Browse the shop and find
                something you like.
            </p>
            <Link
                href="/shop"
                className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-primary px-6 text-[14px] font-semibold text-white hover:bg-brand-hover transition-colors"
            >
                Start shopping
                <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
        </div>
    );
}

export default function CartPageContent() {
    const dispatch = useAppDispatch();
    const items = useAppSelector(selectCartItems);
    const loaded = useAppSelector(selectCartLoaded);
    const cartError = useAppSelector(selectCartError);

    const selectable = items.filter((item) => item.available);
    const selectedIds = selectable.filter((item) => item.selected).map((item) => item.product_id);
    const allSelected = selectable.length > 0 && selectedIds.length === selectable.length;
    const someSelected = selectedIds.length > 0 && !allSelected;
    const unavailableIds = items.filter((item) => !item.available).map((item) => item.product_id);
    const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
    const selectAllRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
    }, [someSelected]);

    return (
        <div className="w-full bg-bg-base">
            <CartBreadcrumb />

            <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-10 lg:py-12">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="m-0 text-[24px] sm:text-[28px] font-bold text-text-primary">
                            Shopping Cart
                        </h1>
                        {loaded && items.length > 0 && (
                            <p className="m-0 mt-1 text-[14px] text-text-secondary">
                                {items.length} product{items.length === 1 ? "" : "s"} ·{" "}
                                {totalUnits} item{totalUnits === 1 ? "" : "s"}
                            </p>
                        )}
                    </div>
                    {loaded && items.length > 0 && (
                        <Link
                            href="/shop"
                            className="inline-flex items-center gap-1.5 text-[14px] font-medium text-brand-primary hover:text-brand-hover transition-colors"
                        >
                            <ArrowLeft className="size-4" aria-hidden="true" />
                            Continue shopping
                        </Link>
                    )}
                </div>

                {cartError && (
                    <div
                        role="alert"
                        className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-error/40 bg-error/5 px-4 py-3 text-[13px] text-error"
                    >
                        <span>{cartError}</span>
                        <button
                            type="button"
                            onClick={() => dispatch(clearCartError())}
                            aria-label="Dismiss"
                            className="shrink-0 cursor-pointer"
                        >
                            <X className="size-4" aria-hidden="true" />
                        </button>
                    </div>
                )}

                {!loaded ? (
                    <CartSkeleton />
                ) : items.length === 0 ? (
                    <EmptyCart />
                ) : (
                    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
                        <section aria-label="Cart items" className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-default bg-bg-surface px-4 py-3">
                                <label className="inline-flex items-center gap-3 text-[14px] font-medium text-text-primary cursor-pointer">
                                    <input
                                        ref={selectAllRef}
                                        type="checkbox"
                                        checked={allSelected}
                                        disabled={selectable.length === 0}
                                        onChange={(e) =>
                                            void dispatch(
                                                setLinesSelected({
                                                    selected: e.target.checked,
                                                    productIds: selectable.map((i) => i.product_id),
                                                }),
                                            )
                                        }
                                        aria-label="Select all products for checkout"
                                        className={checkboxClass}
                                    />
                                    Select all
                                    <span className="font-normal text-text-secondary">
                                        ({selectedIds.length}/{selectable.length})
                                    </span>
                                </label>

                                <div className="flex items-center gap-1">
                                    {unavailableIds.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => void dispatch(removeCartLines(unavailableIds))}
                                            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-text-secondary hover:bg-bg-subtle hover:text-text-primary cursor-pointer transition-colors"
                                        >
                                            <PackageX className="size-4" aria-hidden="true" />
                                            Clear out of stock
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        disabled={selectedIds.length === 0}
                                        onClick={() => void dispatch(removeCartLines(selectedIds))}
                                        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-error hover:bg-error/10 cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                                    >
                                        <Trash2 className="size-4" aria-hidden="true" />
                                        Remove selected
                                    </button>
                                </div>
                            </div>

                            <ul className="m-0 flex list-none flex-col gap-3 p-0">
                                {items.map((item) => (
                                    <CartItemCard key={item.product_id} item={item} />
                                ))}
                            </ul>
                        </section>

                        <OrderSummary totalLines={items.length} />
                    </div>
                )}
            </div>
        </div>
    );
}
