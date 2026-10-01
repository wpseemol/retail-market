import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { activeProductScope } from "./publicProducts.js";

/** Mounted at `/api/sitemap-entries`: everything the storefront sitemap should list. */
export const publicSitemapRouter = Router();

const MAX_PRODUCTS = 45_000;

publicSitemapRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [products, categories, stores, brands] = await Promise.all([
      prisma.product.findMany({
        where: activeProductScope(),
        select: { slug: true, updated_at: true },
        orderBy: { updated_at: "desc" },
        take: MAX_PRODUCTS,
      }),
      prisma.category.findMany({
        where: { is_active: true, deleted_at: null },
        select: { slug: true, updated_at: true },
        orderBy: { sort_order: "asc" },
      }),
      prisma.vendor.findMany({
        where: { status: "active", deleted_at: null, noindex: false },
        select: { slug: true, updated_at: true },
        orderBy: { updated_at: "desc" },
      }),
      prisma.brand.findMany({
        where: { is_active: true, deleted_at: null, noindex: false },
        select: { slug: true, updated_at: true },
        orderBy: { name: "asc" },
      }),
    ]);

    res.set("Cache-Control", "public, max-age=300");
    return res.json({ products, categories, stores, brands });
  }),
);
