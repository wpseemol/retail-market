import { Router } from "express";
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
});

function toStorefrontShop(vendor: {
  id: bigint;
  shop_name: string;
  slug: string;
  description: string | null;
  logo: Parameters<typeof toPublicMedia>[0];
  _count?: { products: number };
}) {
  return {
    id: vendor.id.toString(),
    shop_name: vendor.shop_name,
    slug: vendor.slug,
    description: vendor.description,
    logo: toPublicMedia(vendor.logo),
    products_count: vendor._count?.products ?? undefined,
  };
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

  const { page, limit, q } = queryParsed.data;
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
 * Public storefront — active store + active products only.
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

  const { page, limit } = queryParsed.data;
  const slug = slugParsed.data;

  const vendor = await prisma.vendor.findFirst({
    where: {
      slug,
      status: "active",
      deleted_at: null,
    },
    include: { logo: true },
  });

  if (!vendor) {
    return res.status(404).json({ message: "Store not found" });
  }

  const where = {
    vendor_id: vendor.id,
    status: "active" as const,
    deleted_at: null,
  };

  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: productWithCatalogInclude,
      orderBy: [
        { is_featured: "desc" },
        { published_at: "desc" },
        { id: "desc" },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return res.json({
    store: toStorefrontShop(vendor),
    products: rows.map(toPublicProduct),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});
