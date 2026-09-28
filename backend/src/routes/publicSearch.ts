import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { toPublicMedia } from "../lib/user.js";
import { findUnsafeInputReason } from "../validators/customerAuth.js";

export const publicSearchRouter = Router();

const suggestQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, "Type at least 2 characters")
    .max(80, "Search is too long")
    .superRefine((value, ctx) => {
      const reason = findUnsafeInputReason(value);
      if (reason) ctx.addIssue({ code: "custom", message: reason });
    }),
  limit: z.coerce.number().int().min(1).max(10).default(6),
});

function activeProductScope(): Prisma.ProductWhereInput {
  return {
    status: "active",
    deleted_at: null,
    OR: [
      { vendor_id: null },
      { vendor: { status: "active", deleted_at: null } },
    ],
  };
}

/**
 * GET /api/search/suggest?q=
 * Header live search — products, categories, and shops in one round trip.
 */
publicSearchRouter.get("/suggest", async (req, res) => {
  const parsed = suggestQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Invalid search",
      code: "INVALID_SEARCH",
    });
  }

  const { q, limit } = parsed.data;

  const [products, productTotal, categories, shops] = await Promise.all([
    prisma.product.findMany({
      where: {
        AND: [
          activeProductScope(),
          {
            OR: [
              { name: { contains: q } },
              { sku: { contains: q } },
              { brand: { contains: q } },
              { brandRef: { name: { contains: q } } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        thumbnail: true,
        category: { select: { name: true, slug: true } },
        vendor: { select: { shop_name: true, slug: true } },
      },
      orderBy: [{ is_featured: "desc" }, { published_at: "desc" }],
      take: limit,
    }),
    prisma.product.count({
      where: {
        AND: [
          activeProductScope(),
          {
            OR: [
              { name: { contains: q } },
              { sku: { contains: q } },
              { brand: { contains: q } },
              { brandRef: { name: { contains: q } } },
            ],
          },
        ],
      },
    }),
    prisma.category.findMany({
      where: {
        is_active: true,
        deleted_at: null,
        OR: [{ name: { contains: q } }, { slug: { contains: q } }],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        parent: { select: { name: true } },
        _count: {
          select: { products: { where: activeProductScope() } },
        },
      },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
      take: 5,
    }),
    prisma.vendor.findMany({
      where: {
        status: "active",
        deleted_at: null,
        OR: [{ shop_name: { contains: q } }, { slug: { contains: q } }],
      },
      select: {
        id: true,
        shop_name: true,
        slug: true,
        logo: true,
        _count: {
          select: {
            products: { where: { status: "active", deleted_at: null } },
          },
        },
      },
      orderBy: [{ shop_name: "asc" }],
      take: 4,
    }),
  ]);

  return res.json({
    q,
    products: products.map((p) => ({
      id: p.id.toString(),
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      thumbnail: toPublicMedia(p.thumbnail)?.path ?? null,
      category: p.category?.name ?? null,
      shop: p.vendor?.shop_name ?? null,
    })),
    product_total: productTotal,
    categories: categories.map((c) => ({
      id: c.id.toString(),
      name: c.name,
      slug: c.slug,
      parent: c.parent?.name ?? null,
      products_count: c._count.products,
    })),
    shops: shops.map((s) => ({
      id: s.id.toString(),
      name: s.shop_name,
      slug: s.slug,
      logo: toPublicMedia(s.logo)?.path ?? null,
      products_count: s._count.products,
    })),
  });
});
