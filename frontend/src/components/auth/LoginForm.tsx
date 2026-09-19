"use client";

import { type FormEvent, useState } from "react";
import AuthInput from "./AuthInput";
import OrDivider from "./OrDivider";
import SocialAuthButtons from "./SocialAuthButtons";
import { EnvelopeIcon, LockIcon } from "./icons";

export default function LoginForm() {
    const [rememberMe, setRememberMe] = useState(false);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
    };

    return (
        <section className="w-full" aria-labelledby="login-heading">
            <h2
                id="login-heading"
                className="text-[28px] sm:text-[32px] font-semibold text-text-primary leading-tight mb-5"
            >
                Login here
            </h2>

            <SocialAuthButtons />
            <OrDivider />

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                    autoComplete="current-password"
                    placeholder="Create a password"
                    leadingIcon={<LockIcon />}
                    showPasswordToggle
                    required
                />

                <label className="flex items-center gap-2.5 cursor-pointer select-none mt-1">
                    <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="size-4 shrink-0 rounded border-border-default accent-brand-primary cursor-pointer"
                    />
                    <span className="text-sm text-text-secondary">
                        Remember Me?
                    </span>
                </label>

                <button
                    type="submit"
                    className="mt-1 w-full h-11 rounded bg-brand-primary hover:bg-brand-hover text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                    Login
                </button>
            </form>
        </section>
    );
}
