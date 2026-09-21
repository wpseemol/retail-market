"use client";

import { AppleIcon, FacebookIcon, GoogleIcon } from "./icons";

type SocialAuthButtonsProps = {
  onGoogleClick?: () => void;
  googleLoading?: boolean;
  disabled?: boolean;
};

const providers = [
  {
    id: "apple",
    label: "Continue with Apple",
    icon: <AppleIcon />,
    className:
      "bg-[#111111] text-white border-[#111111] hover:bg-black dark:bg-bg-subtle dark:text-text-primary dark:border-border-default dark:hover:bg-bg-surface",
    enabled: false,
  },
  {
    id: "google",
    label: "Continue with Google",
    icon: <GoogleIcon />,
    className:
      "bg-bg-surface text-text-primary border-border-default hover:bg-bg-subtle",
    enabled: true,
  },
  {
    id: "facebook",
    label: "Continue with Facebook",
    icon: <FacebookIcon />,
    className:
      "bg-bg-surface text-text-primary border-border-default hover:bg-bg-subtle",
    enabled: false,
  },
] as const;

export default function SocialAuthButtons({
  onGoogleClick,
  googleLoading = false,
  disabled = false,
}: SocialAuthButtonsProps) {
  return (
    <div className="flex flex-col gap-2.5">
      {providers.map((provider) => {
        const isGoogle = provider.id === "google";
        const isDisabled =
          disabled ||
          !provider.enabled ||
          (isGoogle && (googleLoading || !onGoogleClick));

        return (
          <button
            key={provider.id}
            type="button"
            disabled={isDisabled}
            onClick={isGoogle ? onGoogleClick : undefined}
            title={
              provider.enabled
                ? undefined
                : `${provider.label} coming soon`
            }
            className={`w-full h-11 inline-flex items-center justify-center gap-2.5 rounded border text-sm font-medium transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${provider.className}`}
          >
            {provider.icon}
            {isGoogle && googleLoading ? "Connecting…" : provider.label}
          </button>
        );
      })}
    </div>
  );
}
