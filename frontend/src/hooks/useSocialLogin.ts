"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { getSession, signIn } from "next-auth/react";
import { API_URL, type ApiUser } from "@/lib/api";
import { messageForAuthCode } from "@/lib/authErrors";
import { useGoogleIdToken } from "@/hooks/useGoogleIdToken";
import { useFacebookLogin } from "@/hooks/useFacebookLogin";
import { useAppleLogin, type AppleCredential } from "@/hooks/useAppleLogin";

export type SocialProvider = "google" | "facebook" | "apple";

type PublicProviders = Record<SocialProvider, { enabled: boolean; client_id: string | null }>;

const LABEL: Record<SocialProvider, string> = {
  google: "Google",
  facebook: "Facebook",
  apple: "Apple",
};

let providersCache: Promise<PublicProviders | null> | null = null;

function fetchProviders(): Promise<PublicProviders | null> {
  providersCache ??= fetch(`${API_URL}/api/auth/social-providers`, {
    headers: { Accept: "application/json" },
  })
    .then(async (res) => (res.ok ? ((await res.json()) as { providers: PublicProviders }).providers : null))
    .catch(() => {
      providersCache = null;
      return null;
    });
  return providersCache;
}

/**
 * Social sign-in for the storefront login / sign-up forms. Which buttons show and
 * which client IDs are used come from Dashboard → Settings → Social login.
 */
export function useSocialLogin(finishAuth: (user: ApiUser) => void) {
  const [providers, setProviders] = useState<PublicProviders | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void fetchProviders().then((p) => {
      if (!cancelled) setProviders(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const complete = useCallback(
    (provider: SocialProvider, credentials: Record<string, string | undefined>) => {
      setError(null);
      setLoadingProvider(provider);
      startTransition(async () => {
        const fallback = `${LABEL[provider]} sign-in failed`;
        try {
          const result = await signIn(`${provider}-backend`, {
            ...credentials,
            redirect: false,
          });
          if (result?.error) {
            setError(messageForAuthCode(result.code, fallback));
            return;
          }
          const session = await getSession();
          if (!session?.backendUser) {
            setError(fallback);
            return;
          }
          finishAuth(session.backendUser);
        } catch {
          setError(fallback);
        } finally {
          setLoadingProvider(null);
        }
      });
    },
    [finishAuth],
  );

  const onGoogle = useCallback(
    (p: { accessToken: string }) => complete("google", p),
    [complete],
  );
  const onFacebook = useCallback(
    (p: { accessToken: string }) => complete("facebook", p),
    [complete],
  );
  const onApple = useCallback(
    (p: AppleCredential) => complete("apple", p),
    [complete],
  );

  const enabledId = (p: SocialProvider) =>
    providers?.[p].enabled ? providers[p].client_id : null;

  const google = useGoogleIdToken(onGoogle, providers ? enabledId("google") : null);
  const facebook = useFacebookLogin(enabledId("facebook"), onFacebook);
  const apple = useAppleLogin(enabledId("apple"), onApple);

  const start = useCallback(
    (provider: SocialProvider) => {
      setError(null);
      google.clearError();
      facebook.clearError();
      apple.clearError();
      if (provider === "google") google.promptGoogleSignIn();
      else if (provider === "facebook") facebook.start();
      else void apple.start();
    },
    [google, facebook, apple],
  );

  const enabled: Record<SocialProvider, boolean> = {
    google: Boolean(providers?.google.enabled),
    facebook: Boolean(providers?.facebook.enabled),
    apple: Boolean(providers?.apple.enabled),
  };

  return {
    enabled,
    hasAny: enabled.google || enabled.facebook || enabled.apple,
    loadingProvider,
    error: error ?? google.error ?? facebook.error ?? apple.error,
    start,
  };
}
