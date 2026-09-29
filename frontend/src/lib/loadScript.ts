const pending = new Map<string, Promise<void>>();

/** Load a third-party SDK script once (shared across hooks / remounts). */
export function loadScriptOnce(src: string, attrs: Record<string, string> = {}): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  const existing = pending.get(src);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    for (const [k, v] of Object.entries(attrs)) script.setAttribute(k, v);
    script.onload = () => resolve();
    script.onerror = () => {
      pending.delete(src);
      script.remove();
      reject(new Error(`Failed to load ${new URL(src).hostname}`));
    };
    document.head.appendChild(script);
  });
  pending.set(src, promise);
  return promise;
}
