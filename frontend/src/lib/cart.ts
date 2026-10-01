import { ApiError, apiFetch } from "@/lib/api";
import type { CartDto, CartLineRef } from "@/lib/cartTypes";
import type { GuestCartAction } from "@/lib/validators/cart";

/** Guest carts live in an encrypted httpOnly cookie; signed-in carts in the database. */
export type CartMode = "guest" | "user";

// Each guest request rewrites the whole cookie, so they must not overlap or items get lost.
let guestQueue: Promise<unknown> = Promise.resolve();

function guestRequest(method: "GET" | "POST" | "DELETE", body?: GuestCartAction) {
  const run = guestQueue.then(
    () => sendGuestRequest(method, body),
    () => sendGuestRequest(method, body),
  );
  guestQueue = run.catch(() => undefined);
  return run;
}

async function sendGuestRequest(method: "GET" | "POST" | "DELETE", body?: GuestCartAction) {
  const response = await fetch("/api/guest-cart", {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as CartDto & {
    message?: string;
    code?: string;
    errors?: Record<string, string[] | undefined>;
  };
  if (!response.ok) {
    throw new ApiError(data.message ?? "Cart request failed", response.status, data.errors, data.code);
  }
  return data as CartDto;
}

export function fetchCartApi(mode: CartMode) {
  return mode === "guest" ? guestRequest("GET") : apiFetch<CartDto>("/api/customer/cart");
}

export function addCartItemApi(mode: CartMode, productId: string, quantity: number) {
  return mode === "guest"
    ? guestRequest("POST", { action: "add", product_id: productId, quantity })
    : apiFetch<CartDto>("/api/customer/cart/items", {
        method: "POST",
        body: { product_id: productId, quantity },
      });
}

export function updateCartLineApi(
  mode: CartMode,
  productId: string,
  patch: { quantity?: number; selected?: boolean },
) {
  return mode === "guest"
    ? guestRequest("POST", { action: "update", product_id: productId, ...patch })
    : apiFetch<CartDto>(`/api/customer/cart/items/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        body: patch,
      });
}

export async function removeCartLinesApi(mode: CartMode, productIds: string[]) {
  if (mode === "guest") {
    return guestRequest("POST", { action: "remove", product_ids: productIds });
  }
  let cart: CartDto | null = null;
  for (const id of productIds) {
    cart = await apiFetch<CartDto>(`/api/customer/cart/items/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }
  return cart ?? fetchCartApi(mode);
}

export function selectCartLinesApi(mode: CartMode, selected: boolean, productIds?: string[]) {
  return mode === "guest"
    ? guestRequest("POST", { action: "select", selected, product_ids: productIds })
    : apiFetch<CartDto>("/api/customer/cart/selection", {
        method: "PATCH",
        body: { selected, ...(productIds ? { product_ids: productIds } : {}) },
      });
}

/** After sign-in: folds the guest cookie cart into the account cart, then clears the cookie. */
export async function mergeGuestCartIntoAccount(): Promise<CartDto> {
  const guest = await guestRequest("GET").catch(() => null);
  if (!guest || guest.items.length === 0) return fetchCartApi("user");

  const lines: CartLineRef[] = guest.items.map((l) => ({
    product_id: l.product_id,
    quantity: l.quantity,
    selected: l.selected,
  }));
  const merged = await apiFetch<CartDto>("/api/customer/cart/merge", {
    method: "POST",
    body: { items: lines },
  });
  await guestRequest("DELETE").catch(() => undefined);
  return merged;
}
