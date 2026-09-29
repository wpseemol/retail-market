"use client";

import { useCallback, useEffect, useState } from "react";
import { loadScriptOnce } from "@/lib/loadScript";

const APPLE_SDK =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

type AppleSignInResult = {
  authorization?: { id_token?: string; code?: string };
  user?: { name?: { firstName?: string; lastName?: string } };
};

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
          state?: string;
        }) => void;
        signIn: () => Promise<AppleSignInResult>;
      };
    };
  }
}

export type AppleCredential = {
  idToken: string;
  firstName?: string;
  lastName?: string;
};

/**
 * Sign in with Apple JS popup → `id_token` for `POST /api/auth/apple`.
 * The redirect URI (`<origin>/login`) must be registered on the Services ID.
 */
export function useAppleLogin(
  clientId: string | null | undefined,
  onCredential: (payload: AppleCredential) => void,
) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    loadScriptOnce(APPLE_SDK)
      .then(() => {
        if (cancelled || !window.AppleID) return;
        window.AppleID.auth.init({
          clientId,
          scope: "name email",
          redirectURI: `${window.location.origin}/login`,
          usePopup: true,
        });
        setReady(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Apple sign-in unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const start = useCallback(async () => {
    if (!ready || !window.AppleID) {
      setError("Apple sign-in is still loading. Try again in a moment.");
      return;
    }
    setError(null);
    try {
      const res = await window.AppleID.auth.signIn();
      const idToken = res.authorization?.id_token;
      if (!idToken) {
        setError("Apple did not return a sign-in token");
        return;
      }
      onCredential({
        idToken,
        firstName: res.user?.name?.firstName,
        lastName: res.user?.name?.lastName,
      });
    } catch (err) {
      // `popup_closed_by_user` is a normal cancel.
      const code = (err as { error?: string } | null)?.error;
      if (code && code !== "popup_closed_by_user" && code !== "user_cancelled_authorize") {
        setError("Apple sign-in failed. Try again.");
      }
    }
  }, [ready, onCredential]);

  return { ready, error, clearError: () => setError(null), start };
}
