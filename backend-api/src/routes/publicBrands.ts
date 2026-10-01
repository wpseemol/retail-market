import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { toPublicMedia } from "../lib/user.js";
import { productWithCatalogInclude, toPublicProduct } from "../lib/productCatalog.js";
import { listScopedReviews, reviewSummaryFor } from "../lib/productReviews.js";
import { toPublicShowcase } from "../lib/showcase.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { withSafeInput } from "../validators/customerAuth.js";
import { publicReviewsQuerySchema } from "../validators/productReview.js";
import { activeProductScope } from "./publicProducts.js";
import { productOrderBy, STOREFRONT_SORTS } from "./publicShops.js";

/** Public brand directory and brand showcase pages (no auth). */
export const publicBrandsRouter = Router();

const slugParamSchema = withSafeInput(
  z
    .string()
    .trim()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid brand slug"),
);

const listQuerySchema = z.object({
  q: withSafeInput(z.string().trim().max(120)).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(60),
});

const detailQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(4).max(48).default(12),
  sort: z.enum(STOREFRONT_SORTS).optional(),
});

function brandProductScope(brandId: bigint): Prisma.ProductWhereInput {
  return { AND: [{ brand_id: brandId }, activeProductScope()] };
}

/**
 * GET /api/brands
 * Active brands A–Z with logo and live product count.
 */
publicBrandsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid query" });
    }
    const { q, page, limit } = parsed.data;
    const where: Prisma.BrandWhereInput = {
      deleted_at: null,
      is_active: true,
      ...(q ? { OR: [{ name: { contains: q } }, { slug: { contains: q } }] } : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.brand.count({ where }),
      prisma.brand.findMany({
        where,
        include: {
          image: true,
          _count: { select: { products: { where: activeProductScope() } } },
        },
        orderBy: [{ name: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return res.json({
      brands: rows.map((b) => ({
        id: b.id.toString(),
        name: b.name,
        slug: b.slug,
        description: b.description,
        tagline: b.tagline,
        image: toPublicMedia(b.image),
        products_count: b._count.products,
        updated_at: b.updated_at,
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  }),
);

/**
 * GET /api/brands/:slug
 * Brand showcase: profile, page design, linked store, featured + paged products.
 */
publicBrandsRouter.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const slug = slugParamSchema.safeParse(req.params.slug);
    if (!slug.success) return res.status(400).json({ message: "Invalid brand slug" });
    const query = detailQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ message: query.error.issues[0]?.message ?? "Invalid query" });
    }

    const brand = await prisma.brand.findFirst({
      where: { slug: slug.data, deleted_at: null, is_active: true },
      include: {
        image: true,
        banner: true,
        og_image: true,
        vendor: { include: { logo: true } },
      },
    });
    if (!brand) return res.status(404).json({ message: "Brand not found" });

    const { page, limit } = query.data;
    const sort = query.data.sort ?? "featured_first";
    const scope = brandProductScope(brand.id);

    const [total, rows, featuredRows, summary] = await Promise.all([
      prisma.product.count({ where: scope }),
      prisma.product.findMany({
        where: scope,
        include: productWithCatalogInclude,
        orderBy: productOrderBy(sort),
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.findMany({
        where: { AND: [scope, { is_featured: true }] },
        include: productWithCatalogInclude,
        orderBy: [{ published_at: "desc" }, { id: "desc" }],
        take: 4,
      }),
      reviewSummaryFor({ product: scope }),
    ]);

    const store =
      brand.vendor && brand.vendor.status === "active" && !brand.vendor.deleted_at
        ? {
            id: brand.vendor.id.toString(),
            shop_name: brand.vendor.shop_name,
            slug: brand.vendor.slug,
            logo: toPublicMedia(brand.vendor.logo),
          }
        : null;

    return res.json({
      brand: {
        id: brand.id.toString(),
        name: brand.name,
        slug: brand.slug,
        description: brand.description,
        image: toPublicMedia(brand.image),
        banner: toPublicMedia(brand.banner),
        created_at: brand.created_at,
        updated_at: brand.updated_at,
        ...toPublicShowcase(brand),
        store,
        review_summary: summary,
        products_count: total,
      },
      products: rows.map(toPublicProduct),
      featured_products: featuredRows.map(toPublicProduct),
      sort,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  }),
);

/**
 * GET /api/brands/:slug/reviews
 * Approved reviews across the brand's active products.
 */
publicBrandsRouter.get(
  "/:slug/reviews",
  asyncHandler(async (req, res) => {
    const slug = slugParamSchema.safeParse(req.params.slug);
    if (!slug.success) return res.status(400).json({ message: "Invalid brand slug" });
    const query = publicReviewsQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ message: query.error.issues[0]?.message ?? "Invalid query" });
    }

    const brand = await prisma.brand.findFirst({
      where: { slug: slug.data, deleted_at: null, is_active: true },
      select: { id: true },
    });
    if (!brand) return res.status(404).json({ message: "Brand not found" });

    return res.json(await listScopedReviews(brandProductScope(brand.id), query.data));
  }),
);
