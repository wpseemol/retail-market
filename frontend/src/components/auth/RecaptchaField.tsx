"use client";

import { useEffect, useRef } from "react";
import {
  loadRecaptcha,
  type PublicCaptchaConfig,
} from "@/lib/recaptcha";

type Props = {
  config: PublicCaptchaConfig | null;
  onToken: (token: string | null) => void;
  resetKey?: number;
};

/** Google reCAPTCHA v2 checkbox. v3 is executed on submit instead. */
export default function RecaptchaField({
  config,
  onToken,
  resetKey = 0,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);

  useEffect(() => {
    onToken(null);
    if (!config?.enabled || !config.site_key || config.version === "v3") {
      return;
    }

    let cancelled = false;
    const siteKey = config.site_key;

    void (async () => {
      try {
        await loadRecaptcha(config);
        if (cancelled || !containerRef.current || !window.grecaptcha) return;
        containerRef.current.innerHTML = "";
        widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onToken(token),
          "expired-callback": () => onToken(null),
          "error-callback": () => onToken(null),
        });
      } catch {
        if (!cancelled) onToken(null);
      }
    })();

    return () => {
      cancelled = true;
      widgetIdRef.current = null;
    };
  }, [config, onToken, resetKey]);

  useEffect(() => {
    if (
      resetKey > 0 &&
      widgetIdRef.current != null &&
      window.grecaptcha &&
      config?.version !== "v3"
    ) {
      try {
        window.grecaptcha.reset(widgetIdRef.current);
      } catch {
        /* ignore */
      }
      onToken(null);
    }
  }, [resetKey, config?.version, onToken]);

  if (!config?.enabled || config.version === "v3") return null;

  return (
    <div className="flex justify-start overflow-x-auto">
      <div ref={containerRef} />
    </div>
  );
}
