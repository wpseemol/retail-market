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

export const publicShopsRouter = Router();

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
  _count?: { products: number };
}) {
  return {
    id: vendor.id.toString(),
    shop_name: vendor.shop_name,
    slug: vendor.slug,
    description: vendor.description,
    logo: toPublicMedia(vendor.logo),
    banner: toPublicMedia(vendor.banner),
    storefront_theme: vendor.storefront_theme,
    products_per_page: vendor.products_per_page,
    featured_products_count: vendor.featured_products_count,
    show_banned_brands: vendor.show_banned_brands,
    product_sort: vendor.product_sort,
    products_count: vendor._count?.products ?? undefined,
  };
}

function productOrderBy(
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
    include: { logo: true, banner: true },
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

  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: productWithCatalogInclude,
      orderBy: productOrderBy(vendor.product_sort),
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const products = rows.map(toPublicProduct);
  const featured = products
    .filter((p) => p.is_featured)
    .slice(0, vendor.featured_products_count);

  return res.json({
    store: toStorefrontShop(vendor),
    products,
    featured_products: featured,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});
