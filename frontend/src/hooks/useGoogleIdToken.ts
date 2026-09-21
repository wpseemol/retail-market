"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const GIS_SRC = "https://accounts.google.com/gsi/client";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (
            momentListener?: (notification: {
              isNotDisplayed: () => boolean;
              isSkippedMoment: () => boolean;
              isDismissedMoment: () => boolean;
              getNotDisplayedReason?: () => string;
            }) => void,
          ) => void;
          cancel: () => void;
        };
      };
    };
  }
}

function loadGisScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.google?.accounts?.id) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${GIS_SRC}"]`,
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Sign-In")),
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Sign-In"));
    document.head.appendChild(script);
  });
}

/**
 * Google Identity Services — returns an ID token (`credential`) for the backend.
 */
export function useGoogleIdToken(onCredential: (idToken: string) => void) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  useEffect(() => {
    if (!clientId) {
      setError("Google Sign-In is not configured");
      return;
    }

    let cancelled = false;

    void loadGisScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              callbackRef.current(response.credential);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        setReady(true);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Google Sign-In unavailable",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const promptGoogleSignIn = useCallback(() => {
    if (!clientId) {
      setError("Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google Sign-In");
      return;
    }
    if (!ready || !window.google?.accounts?.id) {
      setError("Google Sign-In is still loading. Try again in a moment.");
      return;
    }

    window.google.accounts.id.prompt((notification) => {
      if (
        notification.isNotDisplayed() ||
        notification.isSkippedMoment() ||
        notification.isDismissedMoment()
      ) {
        setError(
          "Google Sign-In was blocked or dismissed. Allow pop-ups and try again.",
        );
      }
    });
  }, [clientId, ready]);

  return {
    ready: ready && Boolean(clientId),
    configured: Boolean(clientId),
    error,
    clearError: () => setError(null),
    promptGoogleSignIn,
  };
}
