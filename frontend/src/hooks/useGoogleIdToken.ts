"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const GIS_SRC = "https://accounts.google.com/gsi/client";

type GoogleTokenClient = {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              error_description?: string;
            }) => void;
          }) => GoogleTokenClient;
        };
      };
    };
  }
}

function loadGisScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.google?.accounts?.oauth2) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${GIS_SRC}"]`,
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }
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
 * Google Identity Services token popup — returns an OAuth access token
 * for `POST /api/auth/google` (more reliable than One Tap `prompt()`).
 */
export function useGoogleIdToken(
  onCredential: (payload: { accessToken: string }) => void,
) {
  const clientId = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "").trim();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;
  const tokenClientRef = useRef<GoogleTokenClient | null>(null);

  useEffect(() => {
    if (!clientId) {
      setError("Google Sign-In is not configured");
      return;
    }

    let cancelled = false;

    void loadGisScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.oauth2) return;

        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "openid email profile",
          callback: (response) => {
            if (response.error) {
              if (response.error === "access_denied") {
                // User closed the popup — not a hard failure.
                setError(null);
                return;
              }
              setError(
                response.error_description ||
                  "Google Sign-In failed. Try again.",
              );
              return;
            }

            if (!response.access_token) {
              setError("Google did not return an access token");
              return;
            }

            setError(null);
            callbackRef.current({ accessToken: response.access_token });
          },
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
    if (!ready || !tokenClientRef.current) {
      setError("Google Sign-In is still loading. Try again in a moment.");
      return;
    }

    setError(null);
    // Popup account picker — avoid One Tap (often blocked by browsers).
    tokenClientRef.current.requestAccessToken({ prompt: "select_account" });
  }, [clientId, ready]);

  return {
    ready: ready && Boolean(clientId),
    configured: Boolean(clientId),
    error,
    clearError: () => setError(null),
    promptGoogleSignIn,
  };
}
