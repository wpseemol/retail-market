import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  productWithCatalogInclude,
  toPublicProduct,
  toPublicProductDetail,
} from "../lib/productCatalog.js";
import {
  findUnsafeInputReason,
  withSafeInput,
} from "../validators/customerAuth.js";

export const publicProductsRouter = Router();

const idOrSlugSchema = withSafeInput(
  z
    .string()
    .trim()
    .min(1)
    .max(270)
    .regex(/^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/, "Invalid product id or slug"),
);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(24),
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .superRefine((value, ctx) => {
      if (!value) return;
      const reason = findUnsafeInputReason(value);
      if (reason) ctx.addIssue({ code: "custom", message: reason });
    }),
  category: z.string().trim().max(140).optional(),
  brand: z.string().trim().max(140).optional(),
  sort: z
    .enum(["default", "price-asc", "price-desc", "name-asc", "newest"])
    .default("default"),
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

function safeOptionalSlug(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const reason = findUnsafeInputReason(trimmed);
  if (reason) return undefined;
  return trimmed;
}

function orderBy(
  sort: string,
): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price-asc":
      return [{ price: "asc" }, { id: "desc" }];
    case "price-desc":
      return [{ price: "desc" }, { id: "desc" }];
    case "name-asc":
      return [{ name: "asc" }];
    case "newest":
      return [{ published_at: "desc" }, { id: "desc" }];
    default:
      return [
        { is_featured: "desc" },
        { published_at: "desc" },
        { id: "desc" },
      ];
  }
}

/**
 * GET /api/products
 * Public catalog list — active products only.
 */
publicProductsRouter.get("/", async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Invalid query",
    });
  }

  const { page, limit, q, sort } = parsed.data;
  const category = safeOptionalSlug(parsed.data.category);
  const brand = safeOptionalSlug(parsed.data.brand);

  const where: Prisma.ProductWhereInput = {
    AND: [
      activeProductScope(),
      q
        ? {
            OR: [
              { name: { contains: q } },
              { short_description: { contains: q } },
              { brand: { contains: q } },
              { brandRef: { name: { contains: q } } },
              { category: { name: { contains: q } } },
            ],
          }
        : {},
      category
        ? {
            OR: [
              { category: { slug: category } },
              { category: { name: { equals: category } } },
            ],
          }
        : {},
      brand
        ? {
            OR: [
              { brandRef: { slug: brand } },
              { brandRef: { name: { equals: brand } } },
              { brand: { equals: brand } },
            ],
          }
        : {},
    ],
  };

  const [total, rows, categories, brands, priceAgg] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: productWithCatalogInclude,
      orderBy: orderBy(sort),
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.category.findMany({
      where: {
        is_active: true,
        deleted_at: null,
        products: { some: activeProductScope() },
      },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            products: { where: activeProductScope() },
          },
        },
      },
    }),
    prisma.brand.findMany({
      where: {
        is_active: true,
        deleted_at: null,
        products: { some: activeProductScope() },
      },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            products: { where: activeProductScope() },
          },
        },
      },
    }),
    prisma.product.aggregate({
      where: activeProductScope(),
      _min: { price: true },
      _max: { price: true },
    }),
  ]);

  return res.json({
    products: rows.map(toPublicProduct),
    facets: {
      categories: categories.map((c) => ({
        id: c.slug,
        label: c.name,
        count: c._count.products,
      })),
      brands: brands.map((b) => ({
        id: b.slug,
        label: b.name,
        count: b._count.products,
      })),
      price: {
        min: Number(priceAgg._min.price ?? 0),
        max: Number(priceAgg._max.price ?? 0),
      },
    },
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

/**
 * GET /api/products/:idOrSlug
 * Public product detail — active products only.
 */
publicProductsRouter.get("/:idOrSlug", async (req, res) => {
  const parsed = idOrSlugSchema.safeParse(req.params.idOrSlug);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Invalid product",
    });
  }

  const key = parsed.data;
  const byId = /^\d+$/.test(key);

  const row = await prisma.product.findFirst({
    where: {
      AND: [
        byId ? { id: BigInt(key) } : { slug: key },
        activeProductScope(),
      ],
    },
    include: productWithCatalogInclude,
  });

  if (!row) {
    return res.status(404).json({ message: "Product not found" });
  }

  const product = await toPublicProductDetail(row);

  const relatedWhere: Prisma.ProductWhereInput = {
    AND: [
      activeProductScope(),
      { id: { not: row.id } },
      row.vendor_id
        ? { vendor_id: row.vendor_id }
        : row.category_id
          ? { category_id: row.category_id }
          : {},
    ],
  };

  const relatedRows = await prisma.product.findMany({
    where: relatedWhere,
    include: productWithCatalogInclude,
    orderBy: [{ is_featured: "desc" }, { published_at: "desc" }, { id: "desc" }],
    take: 8,
  });

  return res.json({
    product,
    related: relatedRows.map(toPublicProduct),
  });
});
