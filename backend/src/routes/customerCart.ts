import { Router, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import {
  addOrIncrement,
  CartError,
  cartIdFor,
  clampQuantity,
  loadUserCart,
  resolveLines,
} from "../lib/cart.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  cartAddSchema,
  cartLineUpdateSchema,
  cartLinesSchema,
  cartProductParamSchema,
  cartSelectionSchema,
} from "../validators/cart.js";

function validationFailed(res: Response, errors: unknown) {
  return res.status(400).json({ message: "Validation failed", errors });
}

function cartErrorResponse(res: Response, err: unknown) {
  if (err instanceof CartError) {
    return res.status(err.status).json({ message: err.message, code: err.code });
  }
  throw err;
}

/** Public: prices guest-cart lines (stored client-side) from the database. */
export const publicCartRouter = Router();

publicCartRouter.post(
  "/resolve",
  asyncHandler(async (req, res) => {
    const parsed = cartLinesSchema.safeParse(req.body);
    if (!parsed.success) return validationFailed(res, parsed.error.flatten().fieldErrors);
    res.json(await resolveLines(parsed.data.items));
  }),
);

/** Logged-in customer cart stored in `carts` / `cart_items`. Every route returns the full cart. */
export const customerCartRouter = Router();

customerCartRouter.use(requireAuth, requireRoles("customer"));

customerCartRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await loadUserCart(req.auth!.userId));
  }),
);

/** POST /items — adds to the quantity when the product is already in the cart. */
customerCartRouter.post(
  "/items",
  asyncHandler(async (req, res) => {
    const parsed = cartAddSchema.safeParse(req.body);
    if (!parsed.success) return validationFailed(res, parsed.error.flatten().fieldErrors);
    const userId = req.auth!.userId;
    try {
      await addOrIncrement(
        await cartIdFor(userId),
        BigInt(parsed.data.product_id),
        parsed.data.quantity,
      );
    } catch (err) {
      return cartErrorResponse(res, err);
    }
    res.status(201).json(await loadUserCart(userId));
  }),
);

customerCartRouter.patch(
  "/items/:productId",
  asyncHandler(async (req, res) => {
    const params = cartProductParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ message: "Invalid product id" });
    const parsed = cartLineUpdateSchema.safeParse(req.body);
    if (!parsed.success) return validationFailed(res, parsed.error.flatten().fieldErrors);

    const userId = req.auth!.userId;
    const productId = BigInt(params.data.productId);
    const [line, ...duplicates] = await prisma.cartItem.findMany({
      where: { cart: { user_id: userId }, product_id: productId, product_variant_id: null },
      orderBy: { id: "asc" },
      select: { id: true, product: { select: { stock_qty: true } } },
    });
    if (!line) {
      return res.status(404).json({ message: "This product is not in your cart.", code: "NOT_IN_CART" });
    }

    const { quantity, selected } = parsed.data;
    await prisma.$transaction([
      prisma.cartItem.update({
        where: { id: line.id },
        data: {
          ...(quantity !== undefined
            ? { quantity: clampQuantity(quantity, line.product.stock_qty) }
            : {}),
          ...(selected !== undefined ? { selected } : {}),
        },
      }),
      prisma.cartItem.deleteMany({ where: { id: { in: duplicates.map((d) => d.id) } } }),
    ]);
    res.json(await loadUserCart(userId));
  }),
);

customerCartRouter.delete(
  "/items/:productId",
  asyncHandler(async (req, res) => {
    const params = cartProductParamSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ message: "Invalid product id" });
    const userId = req.auth!.userId;
    await prisma.cartItem.deleteMany({
      where: { cart: { user_id: userId }, product_id: BigInt(params.data.productId) },
    });
    res.json(await loadUserCart(userId));
  }),
);

/** PATCH /selection — select or unselect every line, or only `product_ids`. */
customerCartRouter.patch(
  "/selection",
  asyncHandler(async (req, res) => {
    const parsed = cartSelectionSchema.safeParse(req.body);
    if (!parsed.success) return validationFailed(res, parsed.error.flatten().fieldErrors);
    const userId = req.auth!.userId;
    const { selected, product_ids } = parsed.data;
    await prisma.cartItem.updateMany({
      where: {
        cart: { user_id: userId },
        ...(product_ids ? { product_id: { in: product_ids.map((id) => BigInt(id)) } } : {}),
      },
      data: { selected },
    });
    res.json(await loadUserCart(userId));
  }),
);

/**
 * POST /merge — folds a guest cart into the account cart after login.
 * Products already in the cart get their quantities added together.
 */
customerCartRouter.post(
  "/merge",
  asyncHandler(async (req, res) => {
    const parsed = cartLinesSchema.safeParse(req.body);
    if (!parsed.success) return validationFailed(res, parsed.error.flatten().fieldErrors);
    const userId = req.auth!.userId;
    const cartId = await cartIdFor(userId);
    for (const line of parsed.data.items) {
      try {
        await addOrIncrement(cartId, BigInt(line.product_id), line.quantity, line.selected);
      } catch (err) {
        // Unavailable products and a full cart are skipped so the rest still merge.
        if (!(err instanceof CartError)) throw err;
      }
    }
    res.json(await loadUserCart(userId));
  }),
);

/** DELETE / — empties the cart. */
customerCartRouter.delete(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    await prisma.cartItem.deleteMany({ where: { cart: { user_id: userId } } });
    res.json(await loadUserCart(userId));
  }),
);
