"use client";

import type { SocialProvider } from "@/hooks/useSocialLogin";
import { AppleIcon, FacebookIcon, GoogleIcon } from "./icons";

type SocialAuthButtonsProps = {
  /** Enabled flags from Dashboard → Settings → Social login. */
  enabled: Record<SocialProvider, boolean>;
  onSelect: (provider: SocialProvider) => void;
  loadingProvider?: SocialProvider | null;
  disabled?: boolean;
};

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
] as const satisfies ReadonlyArray<{ id: SocialProvider; label: string; icon: React.ReactNode; className: string }>;

export default function SocialAuthButtons({
  enabled,
  onSelect,
  loadingProvider = null,
  disabled = false,
}: SocialAuthButtonsProps) {
  const visible = providers.filter((p) => enabled[p.id]);
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5">
      {visible.map((provider) => (
        <button
          key={provider.id}
          type="button"
          disabled={disabled || loadingProvider !== null}
          onClick={() => onSelect(provider.id)}
          className={`w-full h-11 inline-flex items-center justify-center gap-2.5 rounded border text-sm font-medium transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${provider.className}`}
        >
          {provider.icon}
          {loadingProvider === provider.id ? "Connecting…" : provider.label}
        </button>
      ))}
    </div>
  );
}
