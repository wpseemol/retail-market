import {
  readSealedJson,
  removeSealed,
  writeSealedJson,
} from "@/lib/secureLocalStorage";

const IDS_KEY = "niyenin.wishlist.ids";
const QUEUE_KEY = "niyenin.wishlist.pending";

export type WishlistPending = { id: number; action: "add" | "remove" };

export function readWishlistIds(): number[] {
  const parsed = readSealedJson<unknown>(IDS_KEY);
  return Array.isArray(parsed)
    ? parsed.filter((id): id is number => Number.isInteger(id))
    : [];
}

export function writeWishlistIds(ids: number[]) {
  writeSealedJson(IDS_KEY, ids);
}

export function clearWishlistCache() {
  removeSealed(IDS_KEY);
}

export function queueWishlistChange(id: number, action: "add" | "remove") {
  const next = readWishlistQueue().filter((item) => item.id !== id);
  next.push({ id, action });
  writeSealedJson(QUEUE_KEY, next);
}

export function readWishlistQueue(): WishlistPending[] {
  const parsed = readSealedJson<unknown>(QUEUE_KEY);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (item): item is WishlistPending =>
      !!item &&
      typeof item === "object" &&
      Number.isInteger((item as WishlistPending).id) &&
      ((item as WishlistPending).action === "add" ||
        (item as WishlistPending).action === "remove"),
  );
}

export function clearWishlistQueue() {
  removeSealed(QUEUE_KEY);
}
