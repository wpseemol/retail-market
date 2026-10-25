import type { CartLine } from "@/lib/cartTypes";
import type { CartMode } from "@/lib/cart";

export type OfflineCartOp =
  | { kind: "add"; productId: string; quantity: number }
  | { kind: "qty"; productId: string; quantity: number }
  | { kind: "selected"; productId: string; selected: boolean }
  | { kind: "selectedMany"; productIds?: string[]; selected: boolean }
  | { kind: "remove"; productIds: string[] };

export type CartCache = {
  mode: CartMode;
  items: CartLine[];
  offlineOps: OfflineCartOp[];
};

const KEY = "niyenin.cart.v1";

export function readCartCache(): CartCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CartCache;
    if (!parsed || !Array.isArray(parsed.items) || !Array.isArray(parsed.offlineOps)) {
      return null;
    }
    if (parsed.mode !== "guest" && parsed.mode !== "user") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCartCache(cache: CartCache) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // A full disk should not block the cart UI.
  }
}
