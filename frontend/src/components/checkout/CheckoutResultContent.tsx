"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { readLastOnlineOrder } from "@/lib/payment";
import { retryPaymentSchema } from "@/lib/validators/checkout";

type ResultStatus = "success" | "review" | "failed" | "cancelled";

const COPY: Record<
    ResultStatus,
    { title: string; body: string; tone: "success" | "warning" | "error" }
> = {
    success: {
        title: "Payment successful",
        body: "Thank you! Your payment was verified and your order is confirmed. We’ve sent the details to your email.",
        tone: "success",
    },
    review: {
        title: "Payment received — under review",
        body: "Your payment went through but SSLCOMMERZ flagged it for a routine security check. We’ll confirm your order once it’s cleared, usually within a few hours.",
        tone: "warning",
    },
    failed: {
        title: "Payment failed",
        body: "We couldn’t complete your payment. Your order is saved — you can try paying again, or contact us if money was deducted.",
        tone: "error",
    },
    cancelled: {
        title: "Payment cancelled",
        body: "You cancelled the payment. Your order is saved as unpaid — you can pay for it now.",
        tone: "error",
    },
};

const TONE_STYLES = {
    success: "bg-brand-tint text-brand-primary border-brand-primary/30",
    warning: "bg-warning/10 text-warning border-warning/30",
    error: "bg-error/10 text-error border-error/30",
} as const;

function StatusIcon({ tone }: { tone: keyof typeof TONE_STYLES }) {
    return (
        <span
            className={`inline-flex size-16 items-center justify-center rounded-full border ${TONE_STYLES[tone]}`}
            aria-hidden
        >
            <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                {tone === "success" ? (
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                ) : tone === "warning" ? (
                    <>
                        <path d="M12 8v5" />
                        <path d="M12 16.5h.01" />
                        <circle cx="12" cy="12" r="9" />
                    </>
                ) : (
                    <path d="M7 7l10 10M17 7L7 17" />
                )}
            </svg>
        </span>
    );
}

function parseStatus(value: string | null): ResultStatus {
    return value === "success" || value === "review" || value === "cancelled"
        ? value
        : "failed";
}

export default function CheckoutResultContent() {
    const params = useSearchParams();
    const { status: authStatus } = useSession();
    const status = parseStatus(params.get("status"));
    const orderParam = params.get("order");
    const copy = COPY[status];

    const [orderNumber, setOrderNumber] = useState(orderParam ?? "");
    const [email, setEmail] = useState("");
    const [emailFromStorage, setEmailFromStorage] = useState(false);
    const [retrying, setRetrying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [emailError, setEmailError] = useState<string | null>(null);

    useEffect(() => {
        const stored = readLastOnlineOrder();
        if (!stored) return;
        if (!orderParam || stored.order_number === orderParam) {
            setOrderNumber(stored.order_number);
            setEmail(stored.email);
            setEmailFromStorage(true);
        }
    }, [orderParam]);

    const canRetry = status === "failed" || status === "cancelled";
    const isLoggedIn = authStatus === "authenticated";
    const needsEmailInput = canRetry && !isLoggedIn && !emailFromStorage;

    async function handleRetry(event: FormEvent) {
        event.preventDefault();
        setError(null);
        setEmailError(null);

        const parsed = retryPaymentSchema.safeParse({
            order_number: orderNumber,
            email: email.trim() ? email : undefined,
        });
        if (!parsed.success) {
            const issue = parsed.error.issues[0];
            if (issue?.path[0] === "email") setEmailError(issue.message);
            else setError(issue?.message ?? "Invalid request");
            return;
        }
        if (!isLoggedIn && !parsed.data.email) {
            setEmailError("Enter the email used at checkout");
            return;
        }

        setRetrying(true);
        try {
            const data = await apiFetch<{ gateway_url: string }>(
                "/api/payments/sslcommerz/retry",
                { body: parsed.data },
            );
            window.location.assign(data.gateway_url);
        } catch (err) {
            setRetrying(false);
            if (err instanceof ApiError) {
                const fieldMsg = err.errors?.email?.[0];
                if (fieldMsg) setEmailError(fieldMsg);
                else setError(err.message);
            } else {
                setError("Could not reach the payment gateway. Please try again.");
            }
        }
    }

    return (
        <div className="w-full bg-bg-base">
            <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-24">
                <div className="mx-auto max-w-lg rounded-2xl border border-border-default bg-bg-surface p-8 sm:p-10 text-center shadow-sm">
                    <div className="flex justify-center">
                        <StatusIcon tone={copy.tone} />
                    </div>
                    <h1 className="mt-6 mb-0 text-[24px] font-bold text-text-primary">
                        {copy.title}
                    </h1>
                    {orderNumber ? (
                        <p className="mt-2 mb-0 text-[14px] text-text-secondary">
                            Order{" "}
                            <span className="font-semibold text-text-primary">
                                #{orderNumber}
                            </span>
                        </p>
                    ) : null}
                    <p className="mt-4 mb-0 text-[15px] leading-relaxed text-text-secondary">
                        {copy.body}
                    </p>

                    {canRetry && orderNumber ? (
                        <form onSubmit={handleRetry} noValidate className="mt-8 space-y-4 text-left">
                            {needsEmailInput ? (
                                <div>
                                    <label
                                        htmlFor="retry-email"
                                        className="mb-1.5 block text-[13px] font-medium text-text-primary"
                                    >
                                        Email used at checkout
                                    </label>
                                    <input
                                        id="retry-email"
                                        type="email"
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        aria-invalid={Boolean(emailError)}
                                        aria-describedby={emailError ? "retry-email-error" : undefined}
                                        className="h-11 w-full rounded-lg border border-border-default bg-bg-base px-3.5 text-[14px] text-text-primary outline-none transition-colors focus:border-brand-primary aria-invalid:border-error"
                                    />
                                    {emailError ? (
                                        <p id="retry-email-error" className="mt-1.5 mb-0 text-[12px] text-error">
                                            {emailError}
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}
                            {error ? (
                                <p className="m-0 rounded-lg border border-error/30 bg-error/10 px-3.5 py-2.5 text-[13px] text-error" role="alert">
                                    {error}
                                </p>
                            ) : null}
                            <button
                                type="submit"
                                disabled={retrying}
                                className="h-12 w-full rounded-lg bg-brand-primary text-[15px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {retrying ? "Opening SSLCOMMERZ…" : "Try payment again"}
                            </button>
                        </form>
                    ) : null}

                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[14px]">
                        {isLoggedIn ? (
                            <Link href="/account/orders" className="font-semibold text-brand-primary hover:underline">
                                View my orders
                            </Link>
                        ) : null}
                        <Link href="/shop" className="font-semibold text-text-secondary hover:text-brand-primary">
                            Continue shopping
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
