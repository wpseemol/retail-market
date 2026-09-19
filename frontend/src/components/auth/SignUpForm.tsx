"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import AuthInput from "./AuthInput";
import OrDivider from "./OrDivider";
import SocialAuthButtons from "./SocialAuthButtons";
import { EnvelopeIcon, LockIcon, UserIcon } from "./icons";

export default function SignUpForm() {
    const [agreed, setAgreed] = useState(false);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
    };

    return (
        <section className="w-full" aria-labelledby="signup-heading">
            <h1
                id="signup-heading"
                className="text-[28px] sm:text-[32px] font-semibold text-text-primary leading-tight mb-5"
            >
                Sign Up
            </h1>

            <SocialAuthButtons />
            <OrDivider />

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <AuthInput
                        name="firstName"
                        autoComplete="given-name"
                        placeholder="Ex. Max"
                        leadingIcon={<UserIcon />}
                        required
                    />
                    <AuthInput
                        name="lastName"
                        autoComplete="family-name"
                        placeholder="Ex. Maguire"
                        leadingIcon={<UserIcon />}
                        required
                    />
                </div>

                <AuthInput
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Ex. Maguire@FlexUI.com"
                    leadingIcon={<EnvelopeIcon />}
                    required
                />

                <AuthInput
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Create a password"
                    leadingIcon={<LockIcon />}
                    showPasswordToggle
                    required
                />

                <AuthInput
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Create a password"
                    leadingIcon={<LockIcon />}
                    showPasswordToggle
                    required
                />

                <label className="flex items-start gap-2.5 cursor-pointer select-none mt-1">
                    <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-0.5 size-4 shrink-0 rounded border-border-default accent-brand-primary cursor-pointer"
                        required
                    />
                    <span className="text-sm text-text-secondary leading-snug">
                        I agree to all{" "}
                        <Link
                            href="/terms"
                            className="text-brand-primary font-medium hover:underline"
                        >
                            Terms &amp; Condition
                        </Link>{" "}
                        and feeds
                    </span>
                </label>

                <button
                    type="submit"
                    className="mt-1 w-full h-11 rounded bg-brand-primary hover:bg-brand-hover text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                    Sign Up
                </button>
            </form>
        </section>
    );
}
