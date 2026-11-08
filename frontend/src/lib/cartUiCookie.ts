/**
 * Tiny readable cookie for header cart badge/total on SSR.
 * Real cart lines stay in the encrypted `nyn_cart` cookie (guest) or DB (user).
 * This only stores count + subtotal so reloads skip the loading skeleton.
 */

export const CART_UI_COOKIE_KEY = "niyenin-cart-ui";
export const CART_UI_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type CartUiSnapshot = {
  count: number;
  subtotal: number;
};

export function parseCartUiCookie(
  value: string | null | undefined,
): CartUiSnapshot | null {
  if (!value) return null;
  try {
    const decoded = decodeURIComponent(value);
    const [countRaw, subtotalRaw] = decoded.split("|");
    const count = Number(countRaw);
    const subtotal = Number(subtotalRaw);
    if (
      !Number.isFinite(count) ||
      count < 0 ||
      count > 9999 ||
      !Number.isFinite(subtotal) ||
      subtotal < 0
    ) {
      return null;
    }
    return { count: Math.floor(count), subtotal };
  } catch {
    return null;
  }
}

export function serializeCartUiCookie(snap: CartUiSnapshot): string {
  const count = Math.max(0, Math.floor(snap.count));
  const subtotal = Math.max(0, Number(snap.subtotal) || 0);
  return `${count}|${subtotal}`;
}

export function cartUiCookieHeader(snap: CartUiSnapshot): string {
  return `${CART_UI_COOKIE_KEY}=${encodeURIComponent(serializeCartUiCookie(snap))}; Path=/; Max-Age=${CART_UI_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function clearCartUiCookieHeader(): string {
  return `${CART_UI_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/** Client-only — keeps the SSR header numbers in sync after cart edits. */
export function writeCartUiCookie(snap: CartUiSnapshot) {
  if (typeof document === "undefined") return;
  try {
    document.cookie = cartUiCookieHeader(snap);
  } catch {
    /* ignore */
  }
}

export function clearCartUiCookie() {
  if (typeof document === "undefined") return;
  try {
    document.cookie = clearCartUiCookieHeader();
  } catch {
    /* ignore */
  }
}

export function snapshotFromCartLines(
  items: Array<{ quantity: number; unit_price: number }>,
): CartUiSnapshot {
  return {
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0,
    ),
  };
}
