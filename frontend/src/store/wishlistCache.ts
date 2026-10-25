const IDS_KEY = "niyenin.wishlist.ids";
const QUEUE_KEY = "niyenin.wishlist.pending";

export type WishlistPending = { id: number; action: "add" | "remove" };

export function readWishlistIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(IDS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => Number.isInteger(id)) : [];
  } catch {
    return [];
  }
}

export function writeWishlistIds(ids: number[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(IDS_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage failures.
  }
}

export function clearWishlistCache() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(IDS_KEY);
}

export function queueWishlistChange(id: number, action: "add" | "remove") {
  const next = readWishlistQueue().filter((item) => item.id !== id);
  next.push({ id, action });
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
  } catch {
    // The optimistic heart still shows until the next successful load.
  }
}

export function readWishlistQueue(): WishlistPending[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is WishlistPending =>
        !!item &&
        typeof item === "object" &&
        Number.isInteger((item as WishlistPending).id) &&
        ((item as WishlistPending).action === "add" ||
          (item as WishlistPending).action === "remove"),
    );
  } catch {
    return [];
  }
}

export function clearWishlistQueue() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(QUEUE_KEY);
}
