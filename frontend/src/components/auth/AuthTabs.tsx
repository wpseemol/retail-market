"use client";

import Link from "next/link";
import { useRef } from "react";
import { useSearchParams } from "next/navigation";
import { authSwitchHref } from "@/lib/authRedirect";
import { type AuthMode, useTransformTween } from "./authMotion";

const TABS = [
    { mode: "login", href: "/login", label: "Login" },
    { mode: "register", href: "/register", label: "Register" },
] as const;

export default function AuthTabs({ mode }: { mode: AuthMode }) {
    const next = useSearchParams().get("next");
    const pillRef = useRef<HTMLLIElement>(null);
    const pillTransform = mode === "register" ? "translateX(100%)" : "translateX(0%)";
    useTransformTween(pillRef, pillTransform, 380);

    return (
        <nav aria-label="Login or register" className="mb-8">
            <ul className="relative m-0 grid list-none grid-cols-2 rounded-xl border border-border-default bg-bg-subtle p-1">
                <li
                    ref={pillRef}
                    role="presentation"
                    aria-hidden="true"
                    style={{ transform: pillTransform }}
                    className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg bg-brand-primary shadow-sm"
                />
                {TABS.map((tab) => {
                    const active = tab.mode === mode;
                    return (
                        <li key={tab.mode} className="relative">
                            <Link
                                href={authSwitchHref(tab.href, next)}
                                scroll={false}
                                aria-current={active ? "page" : undefined}
                                className={`flex h-11 items-center justify-center rounded-lg text-[14px] font-semibold ${
                                    active
                                        ? "text-white"
                                        : "text-text-secondary hover:text-brand-primary"
                                }`}
                            >
                                {tab.label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
