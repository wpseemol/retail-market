import Link from "next/link";
import { Suspense } from "react";
import AuthTabs from "./AuthTabs";
import LoginForm from "./LoginForm";
import SignUpForm from "./SignUpForm";
import ApiHealthBadge from "@/components/ApiHealthBadge";

type AuthMode = "login" | "register";

const COPY: Record<AuthMode, { crumb: string; perks: string[] }> = {
    login: {
        crumb: "Login",
        perks: [
            "Track orders and payment status",
            "Save products to your wishlist",
            "Faster checkout with saved details",
        ],
    },
    register: {
        crumb: "Create account",
        perks: [
            "Pay online with bKash, Nagad, Rocket or card",
            "Keep a wishlist across devices",
            "Past guest orders link to your account once you verify your email or phone",
        ],
    },
};

function CheckIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

export default function AuthPage({ mode }: { mode: AuthMode }) {
    const copy = COPY[mode];

    return (
        <main className="flex-1 bg-bg-base">
            <div className="border-b border-border-default bg-bg-subtle/60">
                <div className="container mx-auto px-4 sm:px-6 py-3">
                    <nav aria-label="Breadcrumb" className="text-sm">
                        <ol className="flex items-center gap-2 text-text-secondary">
                            <li>
                                <Link href="/" className="hover:text-brand-primary transition-colors">
                                    Home
                                </Link>
                            </li>
                            <li aria-hidden="true" className="text-text-secondary/60">
                                &gt;
                            </li>
                            <li className="text-text-primary font-medium">{copy.crumb}</li>
                        </ol>
                    </nav>
                </div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-14 lg:py-16">
                <div className="mx-auto grid max-w-5xl grid-cols-1 overflow-hidden rounded-2xl border border-border-default bg-bg-surface shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                    <aside className="relative hidden flex-col justify-between gap-10 bg-brand-primary p-10 text-white lg:flex">
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-white/10"
                        />
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -bottom-32 -left-20 size-80 rounded-full bg-white/5"
                        />
                        <div className="relative">
                            <p className="m-0 text-[13px] font-semibold uppercase tracking-[0.18em] text-white/70">
                                {mode === "login" ? "Welcome back" : "Join us"}
                            </p>
                            <p className="mt-3 mb-0 text-[28px] font-semibold leading-tight">
                                {mode === "login"
                                    ? "Sign in to continue shopping"
                                    : "Create your free shopper account"}
                            </p>
                        </div>
                        <ul className="relative m-0 flex list-none flex-col gap-4 p-0">
                            {copy.perks.map((perk) => (
                                <li key={perk} className="flex items-start gap-3 text-[14px] leading-snug text-white/90">
                                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white/15">
                                        <CheckIcon />
                                    </span>
                                    {perk}
                                </li>
                            ))}
                        </ul>
                    </aside>

                    <div className="p-6 sm:p-10">
                        <div className="mb-6 flex justify-end">
                            <ApiHealthBadge />
                        </div>
                        <Suspense fallback={<div className="min-h-96" aria-hidden />}>
                            <AuthTabs mode={mode} />
                            {mode === "login" ? <LoginForm /> : <SignUpForm />}
                        </Suspense>
                    </div>
                </div>
            </div>
        </main>
    );
}
