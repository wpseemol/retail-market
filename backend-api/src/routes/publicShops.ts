import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { toPublicMedia } from "../lib/user.js";
import {
  productWithCatalogInclude,
  toPublicProduct,
} from "../lib/productCatalog.js";
import {
  findUnsafeInputReason,
  withSafeInput,
} from "../validators/customerAuth.js";
import { publicReviewsQuerySchema } from "../validators/productReview.js";
import { listScopedReviews, reviewSummaryFor } from "../lib/productReviews.js";
import { toPublicShowcase } from "../lib/showcase.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const publicShopsRouter = Router();

export const STOREFRONT_SORTS = ["featured_first", "newest", "price_asc", "price_desc"] as const;

const slugParamSchema = withSafeInput(
  z
    .string()
    .trim()
    .min(2)
    .max(220)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid store slug"),
);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).optional(),
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
  sort: z.enum(STOREFRONT_SORTS).optional(),
});

function toStorefrontShop(vendor: {
  id: bigint;
  shop_name: string;
  slug: string;
  description: string | null;
  storefront_theme: string;
  products_per_page: number;
  featured_products_count: number;
  show_banned_brands: boolean;
  product_sort: string;
  logo: Parameters<typeof toPublicMedia>[0];
  banner?: Parameters<typeof toPublicMedia>[0];
  tagline?: string | null;
  accent_color?: string | null;
  created_at?: Date;
  updated_at?: Date;
  _count?: { products: number };
}) {
  return {
    id: vendor.id.toString(),
    shop_name: vendor.shop_name,
    slug: vendor.slug,
    description: vendor.description,
    tagline: vendor.tagline ?? null,
    accent_color: vendor.accent_color ?? null,
    logo: toPublicMedia(vendor.logo),
    banner: toPublicMedia(vendor.banner),
    created_at: vendor.created_at,
    updated_at: vendor.updated_at,
    storefront_theme: vendor.storefront_theme,
    products_per_page: vendor.products_per_page,
    featured_products_count: vendor.featured_products_count,
    show_banned_brands: vendor.show_banned_brands,
    product_sort: vendor.product_sort,
    products_count: vendor._count?.products ?? undefined,
  };
}

export function productOrderBy(
  sort: string,
): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "newest":
      return [{ published_at: "desc" }, { id: "desc" }];
    case "price_asc":
      return [{ price: "asc" }, { id: "desc" }];
    case "price_desc":
      return [{ price: "desc" }, { id: "desc" }];
    case "featured_first":
    default:
      return [
        { is_featured: "desc" },
        { published_at: "desc" },
        { id: "desc" },
      ];
  }
}

/**
 * GET /api/shops
 * Public directory — active stores only.
 */
publicShopsRouter.get("/", async (req, res) => {
  const queryParsed = listQuerySchema.safeParse(req.query);
  if (!queryParsed.success) {
    return res.status(400).json({
      message: queryParsed.error.issues[0]?.message ?? "Invalid query",
    });
  }

  const { page, q } = queryParsed.data;
  const limit = queryParsed.data.limit ?? 24;
  const where = {
    status: "active" as const,
    deleted_at: null,
    ...(q
      ? {
          OR: [
            { shop_name: { contains: q } },
            { slug: { contains: q } },
            { description: { contains: q } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.vendor.count({ where }),
    prisma.vendor.findMany({
      where,
      include: {
        logo: true,
        banner: true,
        _count: {
          select: {
            products: {
              where: { status: "active", deleted_at: null },
            },
          },
        },
      },
      orderBy: [{ shop_name: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return res.json({
    stores: rows.map(toStorefrontShop),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

/**
 * GET /api/shops/:slug
 * Public storefront — layout from dashboard customization.
 */
publicShopsRouter.get("/:slug", async (req, res) => {
  const slugParsed = slugParamSchema.safeParse(req.params.slug);
  if (!slugParsed.success) {
    return res.status(400).json({
      message: slugParsed.error.issues[0]?.message ?? "Invalid store slug",
    });
  }

  const queryParsed = listQuerySchema.safeParse(req.query);
  if (!queryParsed.success) {
    return res.status(400).json({
      message: queryParsed.error.issues[0]?.message ?? "Invalid query",
    });
  }

  const { page } = queryParsed.data;
  const slug = slugParsed.data;

  const vendor = await prisma.vendor.findFirst({
    where: {
      slug,
      status: "active",
      deleted_at: null,
    },
    include: {
      logo: true,
      banner: true,
      og_image: true,
      brands: {
        where: { deleted_at: null, is_active: true },
        include: { image: true },
        orderBy: [{ sort_order: "asc" }, { name: "asc" }],
        take: 24,
      },
    },
  });

  if (!vendor) {
    return res.status(404).json({ message: "Store not found" });
  }

  const limit = Math.min(
    48,
    Math.max(4, queryParsed.data.limit ?? vendor.products_per_page),
  );

  const where: Prisma.ProductWhereInput = {
    vendor_id: vendor.id,
    status: "active",
    deleted_at: null,
    ...(vendor.show_banned_brands
      ? {}
      : {
          OR: [
            { brand_id: null },
            { brandRef: { is_active: true } },
          ],
        }),
  };

  const sort = queryParsed.data.sort ?? vendor.product_sort;
  const [total, rows, featuredRows, reviewSummary] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: productWithCatalogInclude,
      orderBy: productOrderBy(sort),
      skip: (page - 1) * limit,
      take: limit,
    }),
    vendor.featured_products_count > 0
      ? prisma.product.findMany({
          where: { AND: [where, { is_featured: true }] },
          include: productWithCatalogInclude,
          orderBy: [{ published_at: "desc" }, { id: "desc" }],
          take: vendor.featured_products_count,
        })
      : Promise.resolve([]),
    reviewSummaryFor({ product: { vendor_id: vendor.id, status: "active", deleted_at: null } }),
  ]);

  const products = rows.map(toPublicProduct);

  return res.json({
    store: {
      ...toStorefrontShop(vendor),
      ...toPublicShowcase(vendor),
      brands: vendor.brands.map((b) => ({
        id: b.id.toString(),
        name: b.name,
        slug: b.slug,
        image: toPublicMedia(b.image),
      })),
      review_summary: reviewSummary,
    },
    products,
    featured_products: featuredRows.map(toPublicProduct),
    sort,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

/**
 * GET /api/shops/:slug/reviews
 * Approved reviews across the store's active products, with a star summary.
 */
publicShopsRouter.get(
  "/:slug/reviews",
  asyncHandler(async (req, res) => {
    const slugParsed = slugParamSchema.safeParse(req.params.slug);
    if (!slugParsed.success) {
      return res.status(400).json({ message: "Invalid store slug" });
    }
    const query = publicReviewsQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ message: query.error.issues[0]?.message ?? "Invalid query" });
    }

    const vendor = await prisma.vendor.findFirst({
      where: { slug: slugParsed.data, status: "active", deleted_at: null },
      select: { id: true },
    });
    if (!vendor) return res.status(404).json({ message: "Store not found" });

    return res.json(
      await listScopedReviews(
        { vendor_id: vendor.id, status: "active", deleted_at: null },
        query.data,
      ),
    );
  }),
);
