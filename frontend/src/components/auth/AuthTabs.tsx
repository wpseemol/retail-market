"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authSwitchHref } from "@/lib/authRedirect";

const TABS = [
    { mode: "login", href: "/login", label: "Login" },
    { mode: "register", href: "/register", label: "Register" },
] as const;

export default function AuthTabs({ mode }: { mode: "login" | "register" }) {
    const next = useSearchParams().get("next");

    return (
        <nav aria-label="Login or register" className="mb-8">
            <ul className="m-0 grid list-none grid-cols-2 rounded-xl border border-border-default bg-bg-subtle p-1">
                {TABS.map((tab) => {
                    const active = tab.mode === mode;
                    return (
                        <li key={tab.mode}>
                            <Link
                                href={authSwitchHref(tab.href, next)}
                                aria-current={active ? "page" : undefined}
                                className={`flex h-11 items-center justify-center rounded-lg text-[14px] font-semibold ${
                                    active
                                        ? "bg-brand-primary text-white shadow-sm"
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
