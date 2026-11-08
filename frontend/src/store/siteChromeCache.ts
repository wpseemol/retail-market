import type { SiteChromeHydratePayload, SiteChromeState } from "./siteChromeSlice";
import { applySiteChromePayload, initialSiteChromeState } from "./siteChromeSlice";
import { readSealedJson, writeSealedJson } from "@/lib/secureLocalStorage";

const KEY = "niyenin.site-chrome.v1";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type CachedChrome = {
  savedAt: number;
  payload: SiteChromeHydratePayload;
};

/** Last-known header / footer / home chrome for instant paint on reload. */
export function readSiteChromeCache(): SiteChromeState | null {
  const parsed = readSealedJson<CachedChrome>(KEY);
  if (!parsed?.payload || typeof parsed.savedAt !== "number") return null;
  if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
  return applySiteChromePayload(initialSiteChromeState, parsed.payload);
}

export function writeSiteChromeCache(payload: SiteChromeHydratePayload) {
  const entry: CachedChrome = { savedAt: Date.now(), payload };
  writeSealedJson(KEY, entry);
}
