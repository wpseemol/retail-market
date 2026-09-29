"use client";

import { useCallback, useEffect, useState } from "react";
import { loadScriptOnce } from "@/lib/loadScript";

const FB_SDK = "https://connect.facebook.net/en_US/sdk.js";
const FB_VERSION = "v21.0";

type FbLoginResponse = {
  status?: string;
  authResponse?: { accessToken?: string } | null;
};

declare global {
  interface Window {
    FB?: {
      init: (config: { appId: string; version: string; cookie?: boolean; xfbml?: boolean }) => void;
      login: (cb: (res: FbLoginResponse) => void, opts?: { scope?: string; auth_type?: string }) => void;
    };
  }
}

let initializedFor: string | null = null;

/** Facebook JS SDK popup → user access token for `POST /api/auth/facebook`. */
export function useFacebookLogin(
  appId: string | null | undefined,
  onToken: (payload: { accessToken: string }) => void,
) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appId) return;
    let cancelled = false;
    loadScriptOnce(FB_SDK, { crossorigin: "anonymous" })
      .then(() => {
        if (cancelled || !window.FB) return;
        if (initializedFor !== appId) {
          window.FB.init({ appId, version: FB_VERSION, cookie: false, xfbml: false });
          initializedFor = appId;
        }
        setReady(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Facebook login unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [appId]);

  const start = useCallback(() => {
    if (!ready || !window.FB) {
      setError("Facebook login is still loading. Try again in a moment.");
      return;
    }
    setError(null);
    window.FB.login(
      (res) => {
        const token = res.authResponse?.accessToken;
        if (token) onToken({ accessToken: token });
      },
      { scope: "public_profile,email", auth_type: "rerequest" },
    );
  }, [ready, onToken]);

  return { ready, error, clearError: () => setError(null), start };
}
