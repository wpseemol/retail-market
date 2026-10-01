import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { toPublicMedia } from "./user.js";
import { MAX_CART_LINES, MAX_LINE_QUANTITY } from "../validators/cart.js";

/** Products a customer may see in a list and buy. */
export function purchasableScope(): Prisma.ProductWhereInput {
  return {
    status: "active",
    deleted_at: null,
    OR: [{ vendor_id: null }, { vendor: { status: "active", deleted_at: null } }],
  };
}

export type CartLineRef = {
  product_id: string;
  quantity: number;
  selected?: boolean;
};

export type CartLine = {
  product_id: string;
  /** Reserved for variant selection; the storefront currently sells product-level lines. */
  variant_id: string | null;
  name: string;
  slug: string;
  image: string | null;
  alt: string;
  unit_price: number;
  compare_at_price: number | null;
  stock_qty: number;
  available: boolean;
  quantity: number;
  selected: boolean;
  line_total: number;
};

export type CartDto = {
  items: CartLine[];
  /** Sum of quantities across all lines (header badge). */
  count: number;
  selected_count: number;
  selected_subtotal: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function clampQuantity(quantity: number, stock: number) {
  return Math.max(1, Math.min(MAX_LINE_QUANTITY, quantity, Math.max(stock, 1)));
}

/**
 * Prices lines from the database. Products that no longer exist or are hidden
 * are dropped; out-of-stock ones stay with `available: false`.
 */
export async function resolveLines(refs: CartLineRef[]): Promise<CartDto> {
  const unique = new Map<string, CartLineRef>();
  for (const ref of refs.slice(0, MAX_CART_LINES)) {
    if (!unique.has(ref.product_id)) unique.set(ref.product_id, ref);
  }
  const ids = [...unique.keys()].map((id) => BigInt(id));

  const products =
    ids.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: ids }, ...purchasableScope() },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            compare_at_price: true,
            stock_qty: true,
            thumbnail: true,
          },
        })
      : [];
  const byId = new Map(products.map((p) => [p.id.toString(), p]));

  const items: CartLine[] = [];
  for (const ref of unique.values()) {
    const product = byId.get(ref.product_id);
    if (!product) continue;
    const unit = Number(product.price);
    const available = product.stock_qty > 0;
    const quantity = clampQuantity(ref.quantity, product.stock_qty);
    const thumb = toPublicMedia(product.thumbnail);
    items.push({
      product_id: ref.product_id,
      variant_id: null,
      name: product.name,
      slug: product.slug,
      image: thumb?.path ?? null,
      alt: thumb?.alt_text || product.name,
      unit_price: unit,
      compare_at_price:
        product.compare_at_price != null ? Number(product.compare_at_price) : null,
      stock_qty: product.stock_qty,
      available,
      quantity,
      selected: ref.selected ?? true,
      line_total: round2(unit * quantity),
    });
  }

  const selected = items.filter((l) => l.selected && l.available);
  return {
    items,
    count: items.reduce((n, l) => n + l.quantity, 0),
    selected_count: selected.reduce((n, l) => n + l.quantity, 0),
    selected_subtotal: round2(selected.reduce((sum, l) => sum + l.line_total, 0)),
  };
}

export async function cartIdFor(userId: bigint) {
  const cart = await prisma.cart.upsert({
    where: { user_id: userId },
    create: { user_id: userId },
    update: {},
    select: { id: true },
  });
  return cart.id;
}

export async function loadUserCart(userId: bigint): Promise<CartDto> {
  const rows = await prisma.cartItem.findMany({
    where: { cart: { user_id: userId }, product_variant_id: null },
    orderBy: { created_at: "desc" },
    select: { product_id: true, quantity: true, selected: true },
  });
  const merged = new Map<string, CartLineRef>();
  for (const row of rows) {
    const id = row.product_id.toString();
    const line = merged.get(id);
    if (line) line.quantity += row.quantity;
    else merged.set(id, { product_id: id, quantity: row.quantity, selected: row.selected });
  }
  return resolveLines([...merged.values()]);
}

export class CartError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Adds to the existing line's quantity when the product is already in the cart.
 *
 * MySQL unique keys never match NULL variant ids, so the unique index can't stop
 * duplicate rows; instead the cart row is locked (`FOR UPDATE`) so concurrent
 * adds for the same cart run one after another.
 */
export async function addOrIncrement(
  cartId: bigint,
  productId: bigint,
  quantity: number,
  selected?: boolean,
) {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM carts WHERE id = ${cartId} FOR UPDATE`;

    const product = await tx.product.findFirst({
      where: { id: productId, ...purchasableScope() },
      select: { stock_qty: true },
    });
    if (!product) {
      throw new CartError(404, "PRODUCT_NOT_FOUND", "This product is no longer available.");
    }
    if (product.stock_qty <= 0) {
      throw new CartError(409, "OUT_OF_STOCK", "This product is out of stock.");
    }
    const maxQty = Math.min(MAX_LINE_QUANTITY, product.stock_qty);

    const existing = await tx.cartItem.findMany({
      where: { cart_id: cartId, product_id: productId, product_variant_id: null },
      orderBy: { id: "asc" },
      select: { id: true, quantity: true },
    });

    if (existing.length > 0) {
      const [keep, ...duplicates] = existing;
      const current = existing.reduce((n, row) => n + row.quantity, 0);
      if (current >= maxQty && selected === undefined) {
        throw new CartError(
          409,
          "STOCK_LIMIT",
          `You already have the maximum available quantity (${maxQty}) in your cart.`,
        );
      }
      await tx.cartItem.update({
        where: { id: keep.id },
        data: {
          quantity: clampQuantity(current + quantity, product.stock_qty),
          ...(selected !== undefined ? { selected } : {}),
        },
      });
      if (duplicates.length > 0) {
        await tx.cartItem.deleteMany({ where: { id: { in: duplicates.map((d) => d.id) } } });
      }
      return;
    }

    const lines = await tx.cartItem.count({
      where: { cart_id: cartId, product: purchasableScope() },
    });
    if (lines >= MAX_CART_LINES) {
      throw new CartError(
        400,
        "CART_FULL",
        `Your cart can hold up to ${MAX_CART_LINES} different products.`,
      );
    }
    await tx.cartItem.create({
      data: {
        cart_id: cartId,
        product_id: productId,
        quantity: clampQuantity(quantity, product.stock_qty),
        selected: selected ?? true,
      },
    });
  });
}
