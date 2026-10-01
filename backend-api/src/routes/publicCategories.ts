import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { toPublicMedia } from "../lib/user.js";

export const publicCategoriesRouter = Router();

/**
 * GET /api/categories
 * Active catalog categories for storefront mega-menu (roots + children).
 */
publicCategoriesRouter.get("/", async (_req, res) => {
  const rows = await prisma.category.findMany({
    where: {
      deleted_at: null,
      is_active: true,
      parent_id: null,
    },
    include: {
      image: true,
      children: {
        where: { deleted_at: null, is_active: true },
        orderBy: [{ sort_order: "asc" }, { name: "asc" }],
        include: {
          _count: {
            select: {
              products: {
                where: { deleted_at: null, status: "active" },
              },
            },
          },
        },
      },
      _count: {
        select: {
          products: {
            where: { deleted_at: null, status: "active" },
          },
        },
      },
    },
    orderBy: [{ sort_order: "asc" }, { name: "asc" }],
  });

  return res.json({
    categories: rows.map((row) => ({
      id: row.id.toString(),
      name: row.name,
      slug: row.slug,
      icon: row.icon,
      image: toPublicMedia(row.image),
      products_count: row._count.products,
      children: row.children.map((child) => ({
        id: child.id.toString(),
        name: child.name,
        slug: child.slug,
        products_count: child._count.products,
      })),
    })),
  });
});
