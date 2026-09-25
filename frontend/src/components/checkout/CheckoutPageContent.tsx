"use client";

import {
    useId,
    useState,
    type FormEvent,
    type InputHTMLAttributes,
    type ReactNode,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
    applyCoupon,
    clearCart,
    clearCoupon,
    selectCartDiscount,
    selectCartItems,
    selectCartSubtotal,
    selectCartTotal,
    selectCouponCode,
} from "@/store/cartSlice";
import { apiFetch, ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/money";

type PaymentMethod = "bank" | "check" | "cod" | "paypal";

const PAYMENT_API_MAP: Record<
    PaymentMethod,
    "cash_on_delivery" | "card" | "bank_transfer" | "wallet"
> = {
    bank: "bank_transfer",
    check: "bank_transfer",
    cod: "cash_on_delivery",
    paypal: "wallet",
};

const COUNTRIES = [
    "United States",
    "Canada",
    "United Kingdom",
    "Australia",
    "Germany",
    "France",
    "India",
    "Bangladesh",
] as const;

const PAYMENT_OPTIONS: {
    id: PaymentMethod;
    label: string;
    description?: string;
}[] = [
    {
        id: "bank",
        label: "Direct Bank Transfer",
        description:
            "Make your payment directly into our bank account. Please use your Order ID as the payment reference. Your order will not be shipped until the funds have cleared in our account.",
    },
    {
        id: "check",
        label: "Check Payments",
        description:
            "Please send a check to Store Name, Store Street, Store Town, Store State / County, Store Postcode.",
    },
    {
        id: "cod",
        label: "Cash on Delivery",
        description: "Pay with cash upon delivery.",
    },
    {
        id: "paypal",
        label: "PayPal",
        description:
            "Pay via PayPal; you can pay with your credit card if you don’t have a PayPal account.",
    },
];

function CheckoutBreadcrumb() {
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
                        <Link
                            href="/cart"
                            className="text-text-secondary hover:text-brand-primary transition-colors"
                        >
                            Cart
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
                            Checkout
                        </span>
                    </li>
                </ol>
            </div>
        </nav>
    );
}

function FieldLabel({
    htmlFor,
    children,
    required,
}: {
    htmlFor: string;
    children: ReactNode;
    required?: boolean;
}) {
    return (
        <label
            htmlFor={htmlFor}
            className="block text-[13px] font-medium text-text-primary mb-1.5"
        >
            {children}
            {required ? (
                <span className="text-error ml-0.5" aria-hidden="true">
                    *
                </span>
            ) : null}
        </label>
    );
}

const inputClassName =
    "w-full h-11 px-3.5 rounded-md border border-border-default bg-bg-base text-[14px] text-text-primary placeholder:text-text-secondary/70 outline-none transition-colors focus:border-brand-primary";

const selectClassName = `${inputClassName} appearance-none pr-9 cursor-pointer`;

function TextField({
    id,
    label,
    required,
    optional,
    ...props
}: {
    id: string;
    label: string;
    required?: boolean;
    optional?: boolean;
} & InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div className="w-full">
            <FieldLabel htmlFor={id} required={required}>
                {label}
                {optional ? (
                    <span className="text-text-secondary font-normal">
                        {" "}
                        (Optional)
                    </span>
                ) : null}
            </FieldLabel>
            <input id={id} required={required} className={inputClassName} {...props} />
        </div>
    );
}

function AddressFields({
    idPrefix,
    values,
    onChange,
}: {
    idPrefix: string;
    values: {
        firstName: string;
        lastName: string;
        company: string;
        email: string;
        phone: string;
        country: string;
        address1: string;
        address2: string;
        city: string;
        zip: string;
    };
    onChange: (field: keyof typeof values, value: string) => void;
}) {
    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                    id={`${idPrefix}-first-name`}
                    label="First Name"
                    required
                    value={values.firstName}
                    onChange={(e) => onChange("firstName", e.target.value)}
                    autoComplete="given-name"
                    placeholder="First name"
                />
                <TextField
                    id={`${idPrefix}-last-name`}
                    label="Last Name"
                    required
                    value={values.lastName}
                    onChange={(e) => onChange("lastName", e.target.value)}
                    autoComplete="family-name"
                    placeholder="Last name"
                />
            </div>

            <TextField
                id={`${idPrefix}-company`}
                label="Company Name"
                optional
                value={values.company}
                onChange={(e) => onChange("company", e.target.value)}
                autoComplete="organization"
                placeholder="Company name"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                    id={`${idPrefix}-email`}
                    label="Email Address"
                    required
                    type="email"
                    value={values.email}
                    onChange={(e) => onChange("email", e.target.value)}
                    autoComplete="email"
                    placeholder="Email address"
                />
                <TextField
                    id={`${idPrefix}-phone`}
                    label="Phone"
                    required
                    type="tel"
                    value={values.phone}
                    onChange={(e) => onChange("phone", e.target.value)}
                    autoComplete="tel"
                    placeholder="Phone number"
                />
            </div>

            <div className="w-full relative">
                <FieldLabel htmlFor={`${idPrefix}-country`} required>
                    Country
                </FieldLabel>
                <select
                    id={`${idPrefix}-country`}
                    required
                    value={values.country}
                    onChange={(e) => onChange("country", e.target.value)}
                    className={selectClassName}
                    autoComplete="country-name"
                >
                    <option value="">Select country name</option>
                    {COUNTRIES.map((country) => (
                        <option key={country} value={country}>
                            {country}
                        </option>
                    ))}
                </select>
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3.5 top-[38px] text-text-secondary"
                >
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                        <path
                            d="M1 1.5L6 6.5L11 1.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </span>
            </div>

            <TextField
                id={`${idPrefix}-address1`}
                label="Address 1"
                required
                value={values.address1}
                onChange={(e) => onChange("address1", e.target.value)}
                autoComplete="address-line1"
                placeholder="Street address"
            />

            <TextField
                id={`${idPrefix}-address2`}
                label="Address 2"
                optional
                value={values.address2}
                onChange={(e) => onChange("address2", e.target.value)}
                autoComplete="address-line2"
                placeholder="Apartment, suite, unit etc. (Optional)"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                    id={`${idPrefix}-city`}
                    label="Town / City"
                    required
                    value={values.city}
                    onChange={(e) => onChange("city", e.target.value)}
                    autoComplete="address-level2"
                    placeholder="Town / City"
                />
                <TextField
                    id={`${idPrefix}-zip`}
                    label="Postcode / Zip"
                    required
                    value={values.zip}
                    onChange={(e) => onChange("zip", e.target.value)}
                    autoComplete="postal-code"
                    placeholder="Postcode / Zip"
                />
            </div>
        </div>
    );
}

function NoticeBar({
    open,
    onToggle,
    prompt,
    actionLabel,
    children,
}: {
    open: boolean;
    onToggle: () => void;
    prompt: string;
    actionLabel: string;
    children: ReactNode;
}) {
    return (
        <div className="rounded-md border border-border-default bg-bg-subtle overflow-hidden">
            <p className="m-0 px-4 sm:px-5 py-3.5 text-[14px] text-text-primary">
                {prompt}{" "}
                <button
                    type="button"
                    onClick={onToggle}
                    className="text-brand-primary hover:text-brand-hover font-medium underline-offset-2 hover:underline cursor-pointer bg-transparent border-0 p-0"
                    aria-expanded={open}
                >
                    {actionLabel}
                </button>
            </p>
            {open ? (
                <div className="border-t border-border-default bg-bg-surface px-4 sm:px-5 py-4">
                    {children}
                </div>
            ) : null}
        </div>
    );
}

function CardLogos() {
    return (
        <span className="inline-flex items-center gap-1.5 ml-1.5" aria-hidden="true">
            <span className="h-5 w-8 rounded-[3px] bg-[#1A1F71] text-white text-[8px] font-bold inline-flex items-center justify-center tracking-tight">
                VISA
            </span>
            <span className="h-5 w-8 rounded-[3px] bg-[#EB001B]/80 text-white text-[7px] font-bold inline-flex items-center justify-center">
                MC
            </span>
            <span className="h-5 w-8 rounded-[3px] bg-[#003087] text-white text-[7px] font-bold inline-flex items-center justify-center">
                PP
            </span>
        </span>
    );
}

const emptyAddress = {
    firstName: "",
    lastName: "",
    company: "",
    email: "",
    phone: "",
    country: "",
    address1: "",
    address2: "",
    city: "",
    zip: "",
};

export default function CheckoutPageContent() {
    const router = useRouter();
    const { data: session, status: authStatus } = useSession();
    const dispatch = useAppDispatch();
    const items = useAppSelector(selectCartItems);
    const subtotal = useAppSelector(selectCartSubtotal);
    const discount = useAppSelector(selectCartDiscount);
    const total = useAppSelector(selectCartTotal);
    const appliedCoupon = useAppSelector(selectCouponCode);
    const formId = useId();

    const [showLogin, setShowLogin] = useState(false);
    const [showCoupon, setShowCoupon] = useState(false);
    const [couponInput, setCouponInput] = useState(appliedCoupon ?? "");
    const [couponMessage, setCouponMessage] = useState<string | null>(null);
    const [createAccount, setCreateAccount] = useState(false);
    const [accountPassword, setAccountPassword] = useState("");
    const [shipDifferent, setShipDifferent] = useState(false);
    const [orderNotes, setOrderNotes] = useState("");
    const [payment, setPayment] = useState<PaymentMethod>("check");
    const [orderPlaced, setOrderPlaced] = useState(false);
    const [orderNumber, setOrderNumber] = useState<string | null>(null);
    const [placing, setPlacing] = useState(false);
    const [placeError, setPlaceError] = useState<string | null>(null);
    const [billing, setBilling] = useState(emptyAddress);
    const [shipping, setShipping] = useState(emptyAddress);
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");

    const updateBilling = (field: keyof typeof billing, value: string) => {
        setBilling((prev) => ({ ...prev, [field]: value }));
    };

    const updateShipping = (field: keyof typeof shipping, value: string) => {
        setShipping((prev) => ({ ...prev, [field]: value }));
    };

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

    const toApiAddress = (addr: typeof emptyAddress) => ({
        full_name: `${addr.firstName} ${addr.lastName}`.trim(),
        phone: addr.phone.trim(),
        line1: addr.address1.trim(),
        line2: addr.address2.trim(),
        city: addr.city.trim(),
        state: "",
        postal_code: addr.zip.trim(),
        country: addr.country.trim() || "Bangladesh",
    });

    const handlePlaceOrder = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (items.length === 0 || placing) return;

        if (authStatus !== "authenticated" || !session?.user) {
            setPlaceError("Please sign in to place your order.");
            setShowLogin(true);
            return;
        }

        setPlacing(true);
        setPlaceError(null);
        try {
            const data = await apiFetch<{
                order: { order_number: string };
            }>("/api/customer/orders", {
                method: "POST",
                body: {
                    items: items.map((item) => ({
                        product_id: item.id,
                        name: item.name,
                        unit_price: item.price,
                        quantity: item.quantity,
                    })),
                    billing: toApiAddress(billing),
                    shipping: shipDifferent
                        ? toApiAddress(shipping)
                        : undefined,
                    payment_method: PAYMENT_API_MAP[payment],
                    notes: orderNotes.trim(),
                    discount_amount: discount,
                    shipping_fee: 0,
                },
            });
            setOrderNumber(data.order.order_number);
            setOrderPlaced(true);
            dispatch(clearCart());
        } catch (err) {
            setPlaceError(
                err instanceof ApiError
                    ? err.message
                    : "Could not place order. Please try again.",
            );
        } finally {
            setPlacing(false);
        }
    };

    if (items.length === 0 && !orderPlaced) {
        return (
            <div className="w-full bg-bg-base">
                <CheckoutBreadcrumb />
                <div className="container mx-auto px-4 sm:px-6 py-20 flex flex-col items-center justify-center gap-4 text-center">
                    <p className="text-[18px] font-semibold text-text-primary m-0">
                        Your cart is empty
                    </p>
                    <p className="text-[14px] text-text-secondary m-0 max-w-md">
                        Add items to your cart before checking out.
                    </p>
                    <Link
                        href="/shop"
                        className="mt-2 h-11 px-6 inline-flex items-center justify-center rounded-md bg-brand-primary hover:bg-brand-hover text-white text-[14px] font-semibold transition-colors"
                    >
                        Return to Shop
                    </Link>
                </div>
            </div>
        );
    }

    if (orderPlaced) {
        return (
            <div className="w-full bg-bg-base">
                <CheckoutBreadcrumb />
                <div className="container mx-auto px-4 sm:px-6 py-20 flex flex-col items-center justify-center gap-4 text-center">
                    <p className="text-[22px] font-semibold text-text-primary m-0">
                        Thank you! Your order has been placed.
                    </p>
                    <p className="text-[14px] text-text-secondary m-0 max-w-md">
                        We’ve received your order
                        {orderNumber ? (
                            <>
                                {" "}
                                <span className="font-semibold text-text-primary">
                                    {orderNumber}
                                </span>
                            </>
                        ) : null}{" "}
                        and will process it shortly. Staff will see it in the
                        dashboard notifications.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                        <Link
                            href="/shop"
                            className="h-11 px-6 inline-flex items-center justify-center rounded-md bg-brand-primary hover:bg-brand-hover text-white text-[14px] font-semibold transition-colors"
                        >
                            Continue Shopping
                        </Link>
                        <button
                            type="button"
                            onClick={() => router.push("/")}
                            className="h-11 px-6 inline-flex items-center justify-center rounded-md border border-border-default bg-bg-surface text-text-primary text-[14px] font-semibold hover:bg-bg-subtle transition-colors cursor-pointer"
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-bg-base">
            <CheckoutBreadcrumb />

            <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-10 lg:py-12">
                <div className="flex flex-col gap-3 mb-8">
                    <NoticeBar
                        open={showLogin}
                        onToggle={() => setShowLogin((v) => !v)}
                        prompt="Returning customer?"
                        actionLabel="Click here to login"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                            <TextField
                                id={`${formId}-login-email`}
                                label="Email Address"
                                type="email"
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                                placeholder="Email address"
                            />
                            <TextField
                                id={`${formId}-login-password`}
                                label="Password"
                                type="password"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                placeholder="Password"
                            />
                            <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    className="h-11 px-6 rounded-md bg-brand-primary hover:bg-brand-hover text-white text-[14px] font-semibold transition-colors cursor-pointer"
                                >
                                    Login
                                </button>
                                <Link
                                    href="/login"
                                    className="text-[13px] text-brand-primary hover:underline"
                                >
                                    Go to login page
                                </Link>
                            </div>
                        </div>
                    </NoticeBar>

                    <NoticeBar
                        open={showCoupon}
                        onToggle={() => setShowCoupon((v) => !v)}
                        prompt="Have a coupon?"
                        actionLabel="Click here to enter your code"
                    >
                        <div className="flex flex-col sm:flex-row gap-2.5 max-w-xl">
                            <input
                                type="text"
                                value={couponInput}
                                onChange={(e) => {
                                    setCouponInput(e.target.value);
                                    setCouponMessage(null);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleApplyCoupon();
                                    }
                                }}
                                placeholder="Coupon Code"
                                aria-label="Coupon code"
                                className={`${inputClassName} sm:max-w-[240px]`}
                            />
                            <button
                                type="button"
                                onClick={handleApplyCoupon}
                                className="h-11 px-5 shrink-0 rounded-md bg-brand-primary hover:bg-brand-hover text-white text-[14px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
                            >
                                Apply Coupon
                            </button>
                        </div>
                        {couponMessage ? (
                            <p
                                className={`mt-2 text-[12px] m-0 ${
                                    appliedCoupon
                                        ? "text-brand-primary"
                                        : "text-error"
                                }`}
                                aria-live="polite"
                            >
                                {couponMessage}
                            </p>
                        ) : null}
                    </NoticeBar>
                </div>

                <form
                    onSubmit={handlePlaceOrder}
                    className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_424px] gap-8 lg:gap-10 items-start"
                >
                    {/* Billing */}
                    <div className="min-w-0">
                        <h1 className="text-[22px] sm:text-[24px] font-semibold text-text-primary m-0 mb-5">
                            Billing Details
                        </h1>

                        <AddressFields
                            idPrefix={`${formId}-billing`}
                            values={billing}
                            onChange={updateBilling}
                        />

                        <label className="mt-5 flex items-start gap-2.5 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={createAccount}
                                onChange={(e) =>
                                    setCreateAccount(e.target.checked)
                                }
                                className="size-4 mt-0.5 shrink-0 rounded border-border-default accent-brand-primary cursor-pointer"
                            />
                            <span className="text-[14px] font-medium text-text-primary">
                                Create an account?
                            </span>
                        </label>

                        {createAccount ? (
                            <div className="mt-3 pl-0 sm:pl-6 flex flex-col gap-3">
                                <p className="m-0 text-[13px] text-text-secondary leading-relaxed">
                                    Create an account by entering the information
                                    below. If you are a returning customer please
                                    login at the top of the page.
                                </p>
                                <TextField
                                    id={`${formId}-account-password`}
                                    label="Account password"
                                    required
                                    type="password"
                                    value={accountPassword}
                                    onChange={(e) =>
                                        setAccountPassword(e.target.value)
                                    }
                                    autoComplete="new-password"
                                    placeholder="Password"
                                />
                            </div>
                        ) : null}

                        <div className="mt-8 pt-6 border-t border-border-default">
                            <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                                <span className="text-[18px] sm:text-[20px] font-semibold text-text-primary">
                                    Ship to a different address?
                                </span>
                                <input
                                    type="checkbox"
                                    checked={shipDifferent}
                                    onChange={(e) =>
                                        setShipDifferent(e.target.checked)
                                    }
                                    className="size-4 shrink-0 rounded border-border-default accent-brand-primary cursor-pointer"
                                />
                            </label>

                            {shipDifferent ? (
                                <div className="mt-5">
                                    <AddressFields
                                        idPrefix={`${formId}-shipping`}
                                        values={shipping}
                                        onChange={updateShipping}
                                    />
                                </div>
                            ) : null}
                        </div>

                        <div className="mt-6">
                            <FieldLabel htmlFor={`${formId}-notes`}>
                                Order notes{" "}
                                <span className="text-text-secondary font-normal">
                                    (Optional)
                                </span>
                            </FieldLabel>
                            <textarea
                                id={`${formId}-notes`}
                                rows={5}
                                value={orderNotes}
                                onChange={(e) => setOrderNotes(e.target.value)}
                                placeholder="Notes about your order, e.g. special notes for delivery."
                                className="w-full min-h-[120px] px-3.5 py-3 rounded-md border border-border-default bg-bg-base text-[14px] text-text-primary placeholder:text-text-secondary/70 outline-none transition-colors focus:border-brand-primary resize-y"
                            />
                        </div>
                    </div>

                    {/* Your Order */}
                    <aside className="w-full lg:sticky lg:top-6 border border-border-default rounded-lg bg-bg-surface overflow-hidden">
                        <div className="px-5 py-4 border-b border-border-default">
                            <h2 className="text-[18px] font-semibold text-text-primary m-0">
                                Your Order
                            </h2>
                        </div>

                        <div className="px-5 pt-3">
                            <div className="flex items-center justify-between py-2.5 border-b border-border-default text-[13px] font-semibold text-text-primary">
                                <span>Product</span>
                                <span>Subtotal</span>
                            </div>

                            <ul className="list-none m-0 p-0">
                                {items.map((item) => (
                                    <li
                                        key={item.id}
                                        className="flex items-start justify-between gap-3 py-3.5 border-b border-border-default"
                                    >
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className="relative h-12 w-12 rounded border border-border-default bg-bg-subtle overflow-hidden shrink-0">
                                                <Image
                                                    src={item.image}
                                                    alt={item.alt}
                                                    fill
                                                    sizes="48px"
                                                    className="object-contain p-1"
                                                />
                                            </div>
                                            <p className="m-0 text-[13px] text-text-primary leading-snug">
                                                <span className="line-clamp-2">
                                                    {item.name}
                                                </span>
                                                <span className="text-text-secondary">
                                                    {" "}
                                                    × {item.quantity}
                                                </span>
                                            </p>
                                        </div>
                                        <span className="text-[13px] font-medium text-text-primary tabular-nums shrink-0">
                                            {formatPrice(
                                                item.price * item.quantity,
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <div className="flex items-center justify-between py-3.5 border-b border-border-default">
                                <span className="text-[14px] text-text-primary">
                                    Subtotal
                                </span>
                                <span className="text-[14px] font-medium text-text-primary tabular-nums">
                                    {formatPrice(subtotal)}
                                </span>
                            </div>

                            {discount > 0 ? (
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
                            ) : null}

                            <div className="flex items-center justify-between py-3.5 border-b border-border-default">
                                <span className="text-[14px] text-text-primary">
                                    Shipping
                                </span>
                                <span className="text-[14px] font-medium text-text-primary">
                                    Free Shipping
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-4 border-b border-border-default">
                                <span className="text-[15px] font-semibold text-text-primary">
                                    Total
                                </span>
                                <span className="text-[16px] font-bold text-brand-primary tabular-nums">
                                    {formatPrice(total)}
                                </span>
                            </div>
                        </div>

                        <fieldset className="m-0 px-5 pt-4 pb-2 border-0">
                            <legend className="sr-only">Payment method</legend>
                            <div className="flex flex-col gap-3">
                                {PAYMENT_OPTIONS.map((option) => {
                                    const selected = payment === option.id;
                                    return (
                                        <div key={option.id}>
                                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                                <input
                                                    type="radio"
                                                    name="payment"
                                                    value={option.id}
                                                    checked={selected}
                                                    onChange={() =>
                                                        setPayment(option.id)
                                                    }
                                                    className="size-4 accent-brand-primary cursor-pointer"
                                                />
                                                <span className="text-[14px] text-text-primary font-medium inline-flex items-center flex-wrap">
                                                    {option.label}
                                                    {option.id === "paypal" ? (
                                                        <>
                                                            <CardLogos />
                                                            <a
                                                                href="https://www.paypal.com"
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="ml-2 text-[12px] font-normal text-info hover:underline"
                                                                onClick={(e) =>
                                                                    e.stopPropagation()
                                                                }
                                                            >
                                                                What is PayPal?
                                                            </a>
                                                        </>
                                                    ) : null}
                                                </span>
                                            </label>
                                            {selected && option.description ? (
                                                <p className="mt-2.5 ml-6 mb-0 rounded-md bg-bg-subtle border border-border-default px-3.5 py-3 text-[12px] leading-relaxed text-text-secondary">
                                                    {option.description}
                                                </p>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        </fieldset>

                        <div className="px-5 py-5">
                            {placeError ? (
                                <p
                                    className="mb-3 text-[13px] text-error"
                                    role="alert"
                                >
                                    {placeError}{" "}
                                    {authStatus !== "authenticated" ? (
                                        <Link
                                            href="/login"
                                            className="font-semibold underline"
                                        >
                                            Sign in
                                        </Link>
                                    ) : null}
                                </p>
                            ) : null}
                            <button
                                type="submit"
                                disabled={placing}
                                className="w-full h-12 inline-flex items-center justify-center rounded-md bg-brand-primary hover:bg-brand-hover disabled:opacity-60 text-white text-[15px] font-semibold tracking-wide uppercase transition-colors cursor-pointer"
                            >
                                {placing ? "Placing…" : "Place Order"}
                            </button>
                        </div>
                    </aside>
                </form>
            </div>
        </div>
    );
}
