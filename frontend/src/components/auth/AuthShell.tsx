"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useRef } from "react";
import AuthTabs from "./AuthTabs";
import LoginForm from "./LoginForm";
import SignUpForm from "./SignUpForm";
import ApiHealthBadge from "@/components/ApiHealthBadge";
import {
    type AuthMode,
    type SwapVariant,
    useAutoHeight,
    useModeSwap,
    useTransformTween,
} from "./authMotion";

const COPY: Record<
    AuthMode,
    { crumb: string; eyebrow: string; title: string; perks: string[] }
> = {
    login: {
        crumb: "Login",
        eyebrow: "Welcome back",
        title: "Sign in to continue shopping",
        perks: [
            "Track orders and payment status",
            "Save products to your wishlist",
            "Faster checkout with saved details",
        ],
    },
    register: {
        crumb: "Create account",
        eyebrow: "Join us",
        title: "Create your free shopper account",
        perks: [
            "Pay online with bKash, Nagad, Rocket or card",
            "Keep a wishlist across devices",
            "Past guest orders link to your account once you verify your email or phone",
        ],
    },
};

const FORM_SWAP: SwapVariant = {
    exit: (dir) => [
        { opacity: 1, transform: "translateX(0)", filter: "blur(0)" },
        { opacity: 0, transform: `translateX(${dir * -48}px)`, filter: "blur(4px)" },
    ],
    enter: (dir) => [
        { opacity: 0, transform: `translateX(${dir * 48}px)`, filter: "blur(4px)" },
        { opacity: 1, transform: "translateX(0)", filter: "blur(0)" },
    ],
    exitMs: 220,
    enterMs: 440,
    enterDelay: 90,
};

const ASIDE_SWAP: SwapVariant = {
    exit: () => [
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: "translateY(-12px)" },
    ],
    enter: () => [
        { opacity: 0, transform: "translateY(16px)" },
        { opacity: 1, transform: "translateY(0)" },
    ],
    exitMs: 200,
    enterMs: 450,
    stagger: "li",
};

const CRUMB_SWAP: SwapVariant = {
    exit: () => [
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: "translateY(-6px)" },
    ],
    enter: () => [
        { opacity: 0, transform: "translateY(6px)" },
        { opacity: 1, transform: "translateY(0)" },
    ],
    exitMs: 150,
    enterMs: 220,
};

const CIRCLE_A: Record<AuthMode, string> = {
    login: "translate(0px, 0px) scale(1)",
    register: "translate(-44px, 56px) scale(1.25)",
};

const CIRCLE_B: Record<AuthMode, string> = {
    login: "translate(0px, 0px) scale(1)",
    register: "translate(-70px, -68px) scale(1.15)",
};

function CheckIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function FormStage({ mode }: { mode: AuthMode }) {
    const boxRef = useRef<HTMLDivElement>(null);
    const [formMode, formRef] = useModeSwap(mode, FORM_SWAP);
    useAutoHeight(boxRef, formRef);

    return (
        // Negative margin + padding keeps input focus rings inside the clip.
        <div ref={boxRef} className="-m-1 overflow-hidden p-1">
            <div ref={formRef}>
                {formMode === "login" ? <LoginForm /> : <SignUpForm />}
            </div>
        </div>
    );
}

export default function AuthShell() {
    const pathname = usePathname();
    const mode: AuthMode = pathname.startsWith("/register") ? "register" : "login";

    const circleARef = useRef<HTMLDivElement>(null);
    const circleBRef = useRef<HTMLDivElement>(null);

    const [asideMode, asideRef] = useModeSwap(mode, ASIDE_SWAP);
    const [crumbMode, crumbRef] = useModeSwap(mode, CRUMB_SWAP);
    useTransformTween(circleARef, CIRCLE_A[mode], 800);
    useTransformTween(circleBRef, CIRCLE_B[mode], 800);

    const aside = COPY[asideMode];

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
                            <li className="text-text-primary font-medium">
                                <div ref={crumbRef} className="inline-block">
                                    {COPY[crumbMode].crumb}
                                </div>
                            </li>
                        </ol>
                    </nav>
                </div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-14 lg:py-16">
                <div className="mx-auto grid max-w-5xl grid-cols-1 overflow-hidden rounded-2xl border border-border-default bg-bg-surface shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                    <aside className="relative hidden flex-col justify-between gap-10 overflow-hidden bg-brand-primary p-10 text-white lg:flex">
                        <div
                            ref={circleARef}
                            aria-hidden="true"
                            style={{ transform: CIRCLE_A[mode] }}
                            className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-white/10"
                        />
                        <div
                            ref={circleBRef}
                            aria-hidden="true"
                            style={{ transform: CIRCLE_B[mode] }}
                            className="pointer-events-none absolute -bottom-32 -left-20 size-80 rounded-full bg-white/5"
                        />

                        <div
                            ref={asideRef}
                            className="relative flex flex-1 flex-col justify-between gap-10"
                        >
                            <div>
                                <p className="m-0 text-[13px] font-semibold uppercase tracking-[0.18em] text-white/70">
                                    {aside.eyebrow}
                                </p>
                                <p className="mt-3 mb-0 text-[28px] font-semibold leading-tight">
                                    {aside.title}
                                </p>
                            </div>
                            <ul className="m-0 flex list-none flex-col gap-4 p-0">
                                {aside.perks.map((perk) => (
                                    <li key={perk} className="flex items-start gap-3 text-[14px] leading-snug text-white/90">
                                        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white/15">
                                            <CheckIcon />
                                        </span>
                                        {perk}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </aside>

                    <div className="p-6 sm:p-10">
                        <div className="mb-6 flex justify-end">
                            <ApiHealthBadge />
                        </div>
                        <Suspense fallback={<div className="min-h-96" aria-hidden />}>
                            <AuthTabs mode={mode} />
                            <FormStage mode={mode} />
                        </Suspense>
                    </div>
                </div>
            </div>
        </main>
    );
}
