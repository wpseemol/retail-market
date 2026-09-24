import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { toPublicMedia } from "../lib/user.js";
import { uniqueVendorSlug } from "../lib/slug.js";
import {
  finalizeProductImageUpload,
  PRODUCT_IMAGES_DIR,
  PRODUCT_IMAGES_RELATIVE,
  sanitizeOriginalName,
} from "../lib/productImage.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { productImageUpload } from "../middleware/upload.js";
import { findUnsafeInputReason } from "../validators/customerAuth.js";

export const dashboardCategoriesRouter = Router();

/** Shared catalog — all staff can read; only elevated staff can mutate. */
dashboardCategoriesRouter.use(
  requireAuth,
  requireRoles("super_admin", "admin", "moderator", "vendor"),
);

const ELEVATED = ["super_admin", "admin", "moderator"] as const;

function withSafeInput(schema: z.ZodString) {
  return schema.superRefine((value, ctx) => {
    const reason = findUnsafeInputReason(value);
    if (reason) ctx.addIssue({ code: "custom", message: reason });
  });
}

function canManageCategories(role: string) {
  return (ELEVATED as readonly string[]).includes(role);
}

const listQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  parent_id: z.string().regex(/^\d+$/).optional().nullable(),
  active: z
    .enum(["true", "false", "all"])
    .optional()
    .default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const createCategorySchema = z.object({
  name: withSafeInput(z.string().trim().min(2).max(150)),
  slug: withSafeInput(
    z
      .string()
      .trim()
      .min(2)
      .max(160)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must be lowercase letters, numbers, and hyphens",
      ),
  ).optional(),
  description: withSafeInput(z.string().trim().max(5000)).optional().nullable(),
  icon: z
    .union([
      withSafeInput(
        z
          .string()
          .trim()
          .max(80)
          .regex(
            /^[A-Z][A-Za-z0-9]*$/,
            "Icon must be a valid Lucide icon name (PascalCase)",
          ),
      ),
      z.null(),
    ])
    .optional(),
  parent_id: z.string().regex(/^\d+$/).optional().nullable(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(999_999).optional(),
});

const updateCategorySchema = createCategorySchema.partial().extend({
  name: withSafeInput(z.string().trim().min(2).max(150)).optional(),
});

function parseId(raw: string) {
  if (!/^\d+$/.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function toPublicCategory(
  row: {
    id: bigint;
    parent_id: bigint | null;
    image_id: bigint | null;
    icon: string | null;
    name: string;
    slug: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
    created_at: Date;
    updated_at: Date;
    image?: Parameters<typeof toPublicMedia>[0];
    parent?: { id: bigint; name: string; slug: string } | null;
    _count?: { products: number; children: number };
  },
) {
  return {
    id: row.id.toString(),
    parent_id: row.parent_id?.toString() ?? null,
    image_id: row.image_id?.toString() ?? null,
    icon: row.icon,
    name: row.name,
    slug: row.slug,
    description: row.description,
    is_active: row.is_active,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
    image: toPublicMedia(row.image),
    parent: row.parent
      ? {
          id: row.parent.id.toString(),
          name: row.parent.name,
          slug: row.parent.slug,
        }
      : null,
    products_count: row._count?.products ?? 0,
    children_count: row._count?.children ?? 0,
  };
}

async function slugTaken(slug: string, excludeId?: bigint) {
  const existing = await prisma.category.findFirst({
    where: {
      slug,
      deleted_at: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(existing);
}

const categoryInclude = {
  image: true,
  parent: { select: { id: true, name: true, slug: true } },
  _count: {
    select: {
      products: { where: { deleted_at: null } },
      children: { where: { deleted_at: null } },
    },
  },
} as const;

/** List platform categories (shared across all stores). */
dashboardCategoriesRouter.get("/", async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
    });
  }

  const { q, parent_id, active, page, limit } = parsed.data;
  const where: Prisma.CategoryWhereInput = { deleted_at: null };

  if (q) {
    where.OR = [
      { name: { contains: q } },
      { slug: { contains: q } },
      { description: { contains: q } },
    ];
  }

  if (parent_id === null || parent_id === "null") {
    where.parent_id = null;
  } else if (parent_id) {
    where.parent_id = BigInt(parent_id);
  }

  if (active === "true") where.is_active = true;
  if (active === "false") where.is_active = false;

  // Vendors only see active categories (for picking when adding products).
  if (req.auth!.role === "vendor") {
    where.is_active = true;
  }

  const skip = (page - 1) * limit;
  const [total, rows] = await Promise.all([
    prisma.category.count({ where }),
    prisma.category.findMany({
      where,
      include: categoryInclude,
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
      skip,
      take: limit,
    }),
  ]);

  return res.json({
    categories: rows.map(toPublicCategory),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

dashboardCategoriesRouter.get("/slug-preview", async (req, res) => {
  const name = String(req.query.name ?? "").trim();
  if (name.length < 2) {
    return res.status(400).json({ message: "Name is required" });
  }
  const slug = await uniqueVendorSlug(name, (s) => slugTaken(s));
  return res.json({ slug });
});

dashboardCategoriesRouter.get("/:id", async (req, res) => {
  const id = parseId(String(req.params.id));
  if (!id) return res.status(400).json({ message: "Invalid category id" });

  const row = await prisma.category.findFirst({
    where: { id, deleted_at: null },
    include: categoryInclude,
  });
  if (!row) return res.status(404).json({ message: "Category not found" });

  if (req.auth!.role === "vendor" && !row.is_active) {
    return res.status(404).json({ message: "Category not found" });
  }

  return res.json({ category: toPublicCategory(row) });
});

/** Upload / replace category icon — elevated staff only. */
dashboardCategoriesRouter.post(
  "/:id/image",
  (req, res, next) => {
    if (!canManageCategories(req.auth!.role)) {
      return res.status(403).json({
        message:
          "Only super admin, admin, or moderator can set category icons",
      });
    }
    productImageUpload.single("image")(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          message: err instanceof Error ? err.message : "Upload failed",
        });
      }
      return next();
    });
  },
  async (req, res) => {
    const id = parseId(String(req.params.id));
    if (!id) return res.status(400).json({ message: "Invalid category id" });

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        message: "Category icon is required (field: image)",
      });
    }

    const existing = await prisma.category.findFirst({
      where: { id, deleted_at: null },
      include: { image: true },
    });
    if (!existing) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        /* ignore */
      }
      return res.status(404).json({ message: "Category not found" });
    }

    const finalized = finalizeProductImageUpload(file.path, file.mimetype);
    if (!finalized.ok) {
      return res.status(400).json({
        message: finalized.message,
        code: finalized.code,
      });
    }

    try {
      const media = await prisma.media.create({
        data: {
          user_id: req.auth!.userId,
          disk: "public",
          file_name: finalized.fileName,
          original_name: sanitizeOriginalName(file.originalname),
          file_path: PRODUCT_IMAGES_RELATIVE,
          file_size: BigInt(finalized.size),
          mime_type: finalized.detected.mime,
          alt_text: existing.name.slice(0, 255),
          collection_name: "product_images",
          is_public: true,
          mediable_type: "Category",
          mediable_id: id,
          sort_order: 0,
        },
      });

      const row = await prisma.category.update({
        where: { id },
        data: { image_id: media.id },
        include: categoryInclude,
      });

      if (existing.image && existing.image.id !== media.id) {
        const oldPath = path.join(PRODUCT_IMAGES_DIR, existing.image.file_name);
        try {
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } catch {
          /* ignore */
        }
        await prisma.media
          .delete({ where: { id: existing.image.id } })
          .catch(() => undefined);
      }

      return res.json({
        message: "Category icon updated",
        category: toPublicCategory(row),
      });
    } catch (err) {
      try {
        fs.unlinkSync(path.join(PRODUCT_IMAGES_DIR, finalized.fileName));
      } catch {
        /* ignore */
      }
      throw err;
    }
  },
);

/** Create — super_admin / admin / moderator only. */
dashboardCategoriesRouter.post("/", async (req, res) => {
  if (!canManageCategories(req.auth!.role)) {
    return res.status(403).json({
      message:
        "Only super admin, admin, or moderator can create product categories",
    });
  }

  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;
  let parentId: bigint | null = null;
  if (data.parent_id) {
    parentId = BigInt(data.parent_id);
    const parent = await prisma.category.findFirst({
      where: { id: parentId, deleted_at: null },
      select: { id: true },
    });
    if (!parent) {
      return res.status(400).json({ message: "Parent category not found" });
    }
  }

  const slug = data.slug
    ? (await slugTaken(data.slug)
        ? await uniqueVendorSlug(data.slug, (s) => slugTaken(s))
        : data.slug)
    : await uniqueVendorSlug(data.name, (s) => slugTaken(s));

  const row = await prisma.category.create({
    data: {
      name: data.name,
      slug,
      description: data.description ?? null,
      icon: data.icon ?? null,
      parent_id: parentId,
      is_active: data.is_active ?? true,
      sort_order: data.sort_order ?? 0,
    },
    include: categoryInclude,
  });

  return res.status(201).json({
    message: "Category created",
    category: toPublicCategory(row),
  });
});

/** Update — elevated staff only. */
dashboardCategoriesRouter.patch("/:id", async (req, res) => {
  if (!canManageCategories(req.auth!.role)) {
    return res.status(403).json({
      message:
        "Only super admin, admin, or moderator can edit product categories",
    });
  }

  const id = parseId(String(req.params.id));
  if (!id) return res.status(400).json({ message: "Invalid category id" });

  const parsed = updateCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ message: "At least one field is required" });
  }

  const existing = await prisma.category.findFirst({
    where: { id, deleted_at: null },
  });
  if (!existing) return res.status(404).json({ message: "Category not found" });

  let parentId: bigint | null | undefined;
  if (data.parent_id === null) {
    parentId = null;
  } else if (data.parent_id !== undefined) {
    parentId = BigInt(data.parent_id);
    if (parentId === id) {
      return res.status(400).json({ message: "Category cannot be its own parent" });
    }
    const parent = await prisma.category.findFirst({
      where: { id: parentId, deleted_at: null },
      select: { id: true },
    });
    if (!parent) {
      return res.status(400).json({ message: "Parent category not found" });
    }
  }

  if (data.slug && (await slugTaken(data.slug, id))) {
    return res.status(409).json({ message: "Slug already in use" });
  }

  const row = await prisma.category.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug,
      description:
        data.description === undefined ? undefined : data.description,
      icon: data.icon === undefined ? undefined : data.icon,
      parent_id: parentId,
      is_active: data.is_active,
      sort_order: data.sort_order,
    },
    include: categoryInclude,
  });

  return res.json({
    message: "Category updated",
    category: toPublicCategory(row),
  });
});

/** Soft-delete — elevated staff only. */
dashboardCategoriesRouter.delete("/:id", async (req, res) => {
  if (!canManageCategories(req.auth!.role)) {
    return res.status(403).json({
      message:
        "Only super admin, admin, or moderator can delete product categories",
    });
  }

  const id = parseId(String(req.params.id));
  if (!id) return res.status(400).json({ message: "Invalid category id" });

  const existing = await prisma.category.findFirst({
    where: { id, deleted_at: null },
  });
  if (!existing) return res.status(404).json({ message: "Category not found" });

  const row = await prisma.category.update({
    where: { id },
    data: { deleted_at: new Date(), is_active: false },
    include: categoryInclude,
  });

  return res.json({
    message: "Category deleted",
    category: toPublicCategory(row),
  });
});
