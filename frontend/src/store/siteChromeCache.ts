import type { SiteChromeHydratePayload, SiteChromeState } from "./siteChromeSlice";
import { applySiteChromePayload, initialSiteChromeState } from "./siteChromeSlice";

const KEY = "niyenin.site-chrome.v1";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type CachedChrome = {
  savedAt: number;
  payload: SiteChromeHydratePayload;
};

/** Last-known header / footer / home chrome for instant paint on reload. */
export function readSiteChromeCache(): SiteChromeState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedChrome;
    if (!parsed?.payload || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    return applySiteChromePayload(initialSiteChromeState, parsed.payload);
  } catch {
    return null;
  }
}

export function writeSiteChromeCache(payload: SiteChromeHydratePayload) {
  if (typeof window === "undefined") return;
  try {
    const entry: CachedChrome = { savedAt: Date.now(), payload };
    localStorage.setItem(KEY, JSON.stringify(entry));
  } catch {
    // Quota errors should not break the chrome UI.
  }
}
