import { NextResponse, type NextRequest } from "next/server";
import {
  readGuestCart,
  resolveGuestLines,
  toCookieLines,
  writeGuestCart,
} from "@/lib/guestCartCookie";
import { type CartLineRef, EMPTY_CART, MAX_CART_LINES, MAX_LINE_QUANTITY } from "@/lib/cartTypes";
import { guestCartActionSchema } from "@/lib/validators/cart";

const noStore = { "Cache-Control": "no-store" };

function unavailable() {
  return NextResponse.json(
    { message: "Cart is temporarily unavailable. Please try again." },
    { status: 502, headers: noStore },
  );
}

/** GET /api/guest-cart — guest cart from the encrypted cookie, priced from the database. */
export async function GET() {
  const lines = await readGuestCart();
  if (lines.length === 0) return NextResponse.json(EMPTY_CART, { headers: noStore });
  try {
    const cart = await resolveGuestLines(lines);
    if (cart.items.length !== lines.length) await writeGuestCart(toCookieLines(cart));
    return NextResponse.json(cart, { headers: noStore });
  } catch {
    return unavailable();
  }
}

/** POST /api/guest-cart — `{ action: "add" | "update" | "remove" | "select", ... }`. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = guestCartActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", errors: parsed.error.flatten().fieldErrors },
      { status: 400, headers: noStore },
    );
  }
  const input = parsed.data;
  let lines: CartLineRef[] = await readGuestCart();
  let quantityBeforeAdd = 0;

  switch (input.action) {
    case "add": {
      const existing = lines.find((l) => l.product_id === input.product_id);
      if (existing) {
        quantityBeforeAdd = existing.quantity;
        existing.quantity = Math.min(MAX_LINE_QUANTITY, existing.quantity + input.quantity);
      } else {
        if (lines.length >= MAX_CART_LINES) {
          return NextResponse.json(
            {
              message: `Your cart can hold up to ${MAX_CART_LINES} different products.`,
              code: "CART_FULL",
            },
            { status: 400, headers: noStore },
          );
        }
        lines = [{ product_id: input.product_id, quantity: input.quantity, selected: true }, ...lines];
      }
      break;
    }
    case "update": {
      const line = lines.find((l) => l.product_id === input.product_id);
      if (!line) {
        return NextResponse.json(
          { message: "This product is not in your cart.", code: "NOT_IN_CART" },
          { status: 404, headers: noStore },
        );
      }
      if (input.quantity !== undefined) line.quantity = input.quantity;
      if (input.selected !== undefined) line.selected = input.selected;
      break;
    }
    case "remove": {
      const ids = new Set(input.product_ids);
      lines = lines.filter((l) => !ids.has(l.product_id));
      break;
    }
    case "select": {
      const ids = input.product_ids ? new Set(input.product_ids) : null;
      for (const line of lines) {
        if (!ids || ids.has(line.product_id)) line.selected = input.selected;
      }
      break;
    }
  }

  let cart;
  try {
    cart = lines.length > 0 ? await resolveGuestLines(lines) : EMPTY_CART;
  } catch {
    return unavailable();
  }

  if (input.action === "add") {
    const added = cart.items.find((l) => l.product_id === input.product_id);
    if (!added || !added.available) {
      return NextResponse.json(
        added
          ? { message: "This product is out of stock.", code: "OUT_OF_STOCK" }
          : { message: "This product is no longer available.", code: "PRODUCT_NOT_FOUND" },
        { status: added ? 409 : 404, headers: noStore },
      );
    }
    const maxQty = Math.min(MAX_LINE_QUANTITY, added.stock_qty);
    if (quantityBeforeAdd >= maxQty) {
      return NextResponse.json(
        {
          message: `You already have the maximum available quantity (${maxQty}) in your cart.`,
          code: "STOCK_LIMIT",
        },
        { status: 409, headers: noStore },
      );
    }
  }

  await writeGuestCart(toCookieLines(cart));
  return NextResponse.json(cart, { headers: noStore });
}

/** DELETE /api/guest-cart — clears the guest cart (after it was merged into an account). */
export async function DELETE() {
  await writeGuestCart([]);
  return NextResponse.json(EMPTY_CART, { headers: noStore });
}
