"use client";

import { AppleIcon, FacebookIcon, GoogleIcon } from "./icons";

const providers = [
    {
        id: "apple",
        label: "Continue with Apple",
        icon: <AppleIcon />,
        className:
            "bg-[#111111] text-white border-[#111111] hover:bg-black dark:bg-bg-subtle dark:text-text-primary dark:border-border-default dark:hover:bg-bg-surface",
    },
    {
        id: "google",
        label: "Continue with Google",
        icon: <GoogleIcon />,
        className:
            "bg-bg-surface text-text-primary border-border-default hover:bg-bg-subtle",
    },
    {
        id: "facebook",
        label: "Continue with Facebook",
        icon: <FacebookIcon />,
        className:
            "bg-bg-surface text-text-primary border-border-default hover:bg-bg-subtle",
    },
] as const;

export default function SocialAuthButtons() {
    return (
        <div className="flex flex-col gap-2.5">
            {providers.map((provider) => (
                <button
                    key={provider.id}
                    type="button"
                    className={`w-full h-11 inline-flex items-center justify-center gap-2.5 rounded border text-sm font-medium transition-colors cursor-pointer ${provider.className}`}
                >
                    {provider.icon}
                    {provider.label}
                </button>
            ))}
        </div>
    );
}
