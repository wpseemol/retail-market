import type { PublicCaptchaConfig } from "./validators/recaptcha";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
      render: (
        container: HTMLElement,
        parameters: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark";
        },
      ) => number;
      reset: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
    };
  }
}

const SCRIPT_V2 = "https://www.google.com/recaptcha/api.js?render=explicit";
const SCRIPT_V3 = (siteKey: string) =>
  `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;

let loadPromise: Promise<void> | null = null;
let loadedSrc: string | null = null;

function loadScript(src: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (loadedSrc === src && window.grecaptcha) return Promise.resolve();
  if (loadPromise && loadedSrc === src) return loadPromise;

  loadedSrc = src;
  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load reCAPTCHA")),
        { once: true },
      );
      if (window.grecaptcha) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load reCAPTCHA"));
    document.head.appendChild(script);
  });
  return loadPromise;
}

export async function loadRecaptcha(config: PublicCaptchaConfig) {
  if (!config.enabled || !config.site_key) return;
  if (config.version === "v3") {
    await loadScript(SCRIPT_V3(config.site_key));
  } else {
    await loadScript(SCRIPT_V2);
  }
  await new Promise<void>((resolve) => {
    if (!window.grecaptcha) {
      resolve();
      return;
    }
    window.grecaptcha.ready(() => resolve());
  });
}

export async function executeRecaptchaV3(
  siteKey: string,
  action = "login",
): Promise<string> {
  await loadScript(SCRIPT_V3(siteKey));
  await new Promise<void>((resolve) => {
    window.grecaptcha?.ready(() => resolve());
  });
  if (!window.grecaptcha) {
    throw new Error("reCAPTCHA failed to load");
  }
  return window.grecaptcha.execute(siteKey, { action });
}

export async function fetchCaptchaConfig(): Promise<PublicCaptchaConfig> {
  const response = await fetch("/api/auth/captcha-config", {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (!response.ok) return { enabled: false };
  return (await response.json()) as PublicCaptchaConfig;
}
