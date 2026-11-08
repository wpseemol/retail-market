import type { CartLine } from "@/lib/cartTypes";
import type { CartMode } from "@/lib/cart";
import { readSealedJson, writeSealedJson } from "@/lib/secureLocalStorage";

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
  const parsed = readSealedJson<CartCache>(KEY);
  if (!parsed || !Array.isArray(parsed.items) || !Array.isArray(parsed.offlineOps)) {
    return null;
  }
  if (parsed.mode !== "guest" && parsed.mode !== "user") return null;
  return parsed;
}

export function writeCartCache(cache: CartCache) {
  writeSealedJson(KEY, cache);
}
