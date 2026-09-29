import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { productWithCatalogInclude, toPublicProduct } from "../lib/productCatalog.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { wishlistAddSchema, wishlistProductParamSchema } from "../validators/wishlist.js";

export const customerWishlistRouter = Router();

customerWishlistRouter.use(requireAuth, requireRoles("customer"));

const MAX_WISHLIST_ITEMS = 200;

function purchasableScope(): Prisma.ProductWhereInput {
  return {
    status: "active",
    deleted_at: null,
    OR: [{ vendor_id: null }, { vendor: { status: "active", deleted_at: null } }],
  };
}

async function wishlistIdFor(userId: bigint) {
  const wishlist = await prisma.wishlist.upsert({
    where: { user_id: userId },
    create: { user_id: userId },
    update: {},
    select: { id: true },
  });
  return wishlist.id;
}

async function productIdsFor(userId: bigint) {
  const rows = await prisma.wishlistItem.findMany({
    where: { wishlist: { user_id: userId }, product: purchasableScope() },
    orderBy: { created_at: "desc" },
    select: { product_id: true },
  });
  return rows.map((r) => r.product_id.toString());
}

/** GET /api/customer/wishlist — full items (newest first). Hidden/deleted products are skipped. */
customerWishlistRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const rows = await prisma.wishlistItem.findMany({
      where: { wishlist: { user_id: req.auth!.userId }, product: purchasableScope() },
      orderBy: { created_at: "desc" },
      include: { product: { include: productWithCatalogInclude } },
    });
    res.json({
      items: rows.map((row) => ({
        added_at: row.created_at,
        product: toPublicProduct(row.product),
      })),
      count: rows.length,
    });
  }),
);

/** GET /api/customer/wishlist/ids — lightweight list for heart-button state. */
customerWishlistRouter.get(
  "/ids",
  asyncHandler(async (req, res) => {
    const productIds = await productIdsFor(req.auth!.userId);
    res.json({ product_ids: productIds, count: productIds.length });
  }),
);

/** POST /api/customer/wishlist — idempotent add. */
customerWishlistRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = wishlistAddSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const productId = BigInt(parsed.data.product_id);
    const product = await prisma.product.findFirst({
      where: { id: productId, ...purchasableScope() },
      select: { id: true },
    });
    if (!product) {
      return res.status(404).json({
        message: "This product is no longer available.",
        code: "PRODUCT_NOT_FOUND",
      });
    }

    const userId = req.auth!.userId;
    const wishlistId = await wishlistIdFor(userId);
    const existing = await prisma.wishlistItem.findUnique({
      where: { wishlist_id_product_id: { wishlist_id: wishlistId, product_id: productId } },
      select: { id: true },
    });
    if (!existing) {
      const count = await prisma.wishlistItem.count({ where: { wishlist_id: wishlistId } });
      if (count >= MAX_WISHLIST_ITEMS) {
        return res.status(400).json({
          message: `Your wishlist can hold up to ${MAX_WISHLIST_ITEMS} products. Remove some to add more.`,
          code: "WISHLIST_FULL",
        });
      }
      await prisma.wishlistItem.upsert({
        where: { wishlist_id_product_id: { wishlist_id: wishlistId, product_id: productId } },
        create: { wishlist_id: wishlistId, product_id: productId },
        update: {},
      });
    }

    const productIds = await productIdsFor(userId);
    res.status(existing ? 200 : 201).json({
      message: "Added to wishlist",
      product_ids: productIds,
      count: productIds.length,
    });
  }),
);

/** DELETE /api/customer/wishlist/:productId — idempotent remove. */
customerWishlistRouter.delete(
  "/:productId",
  asyncHandler(async (req, res) => {
    const parsed = wishlistProductParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid product id" });
    }
    const userId = req.auth!.userId;
    await prisma.wishlistItem.deleteMany({
      where: { wishlist: { user_id: userId }, product_id: BigInt(parsed.data.productId) },
    });
    const productIds = await productIdsFor(userId);
    res.json({ message: "Removed from wishlist", product_ids: productIds, count: productIds.length });
  }),
);
