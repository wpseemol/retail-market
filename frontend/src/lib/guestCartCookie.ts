import { cookies } from "next/headers";
import { EncryptJWT, jwtDecrypt } from "jose";
import { backendFetch, sessionCookieOptions } from "@/lib/session";
import {
  type CartDto,
  type CartLineRef,
  MAX_CART_LINES,
  MAX_LINE_QUANTITY,
} from "@/lib/cartTypes";

// Server-only: reads AUTH_SECRET and the httpOnly guest cart cookie.

export const GUEST_CART_COOKIE = "nyn_cart";
const GUEST_CART_MAX_AGE_SEC = 60 * 60 * 24 * 30;

/** Compact `[productId, quantity, selected 1|0]` tuples keep the cookie well under 4 KB. */
type PackedLine = [string, number, 0 | 1];

async function cartKey() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set in frontend/.env.local (min 32 characters)");
  }
  // Separate label so the cart key never equals the Auth.js session key.
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${secret}:guest-cart`),
  );
  return new Uint8Array(digest);
}

function isPackedLine(value: unknown): value is PackedLine {
  return (
    Array.isArray(value) &&
    typeof value[0] === "string" &&
    /^\d{1,19}$/.test(value[0]) &&
    Number.isInteger(value[1]) &&
    value[1] >= 1 &&
    value[1] <= MAX_LINE_QUANTITY &&
    (value[2] === 0 || value[2] === 1)
  );
}

/** Missing, expired or tampered cookie → empty cart. */
export async function readGuestCart(): Promise<CartLineRef[]> {
  const token = (await cookies()).get(GUEST_CART_COOKIE)?.value;
  if (!token) return [];
  try {
    const { payload } = await jwtDecrypt(token, await cartKey());
    const lines = Array.isArray(payload.l) ? payload.l : [];
    return lines
      .filter(isPackedLine)
      .slice(0, MAX_CART_LINES)
      .map(([product_id, quantity, selected]) => ({
        product_id,
        quantity,
        selected: selected === 1,
      }));
  } catch {
    return [];
  }
}

export async function writeGuestCart(lines: CartLineRef[]) {
  const jar = await cookies();
  if (lines.length === 0) {
    jar.set(GUEST_CART_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
    return;
  }
  const packed: PackedLine[] = lines
    .slice(0, MAX_CART_LINES)
    .map((l) => [l.product_id, l.quantity, l.selected ? 1 : 0]);
  const token = await new EncryptJWT({ l: packed })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${GUEST_CART_MAX_AGE_SEC}s`)
    .encrypt(await cartKey());
  jar.set(GUEST_CART_COOKIE, token, sessionCookieOptions(GUEST_CART_MAX_AGE_SEC));
}

/** Prices cookie lines from the database via the backend. Throws when the backend is unreachable. */
export async function resolveGuestLines(lines: CartLineRef[]): Promise<CartDto> {
  const upstream = await backendFetch("/api/cart/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: lines }),
    cache: "no-store",
  });
  if (!upstream.ok) throw new Error(`Cart resolve failed (${upstream.status})`);
  return (await upstream.json()) as CartDto;
}

/** Cookie lines rebuilt from a resolved cart: drops removed products, keeps clamped quantities. */
export function toCookieLines(cart: CartDto): CartLineRef[] {
  return cart.items.map((l) => ({
    product_id: l.product_id,
    quantity: l.quantity,
    selected: l.selected,
  }));
}
