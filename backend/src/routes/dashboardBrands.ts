import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { uniqueVendorSlug } from "../lib/slug.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { findUnsafeInputReason } from "../validators/customerAuth.js";

export const dashboardBrandsRouter = Router();

dashboardBrandsRouter.use(
  requireAuth,
  requireRoles("super_admin", "admin", "moderator", "vendor"),
);

const ELEVATED = ["super_admin", "admin", "moderator"] as const;

function canManage(role: string) {
  return (ELEVATED as readonly string[]).includes(role);
}

function withSafeInput(schema: z.ZodString) {
  return schema.superRefine((value, ctx) => {
    const reason = findUnsafeInputReason(value);
    if (reason) ctx.addIssue({ code: "custom", message: reason });
  });
}

function parseId(raw: string) {
  if (!/^\d+$/.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

const listQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  active: z.enum(["true", "false", "all"]).optional().default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const brandBodySchema = z.object({
  name: withSafeInput(z.string().trim().min(2).max(120)),
  slug: withSafeInput(
    z
      .string()
      .trim()
      .min(2)
      .max(140)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must be lowercase letters, numbers, and hyphens",
      ),
  ).optional(),
  description: withSafeInput(z.string().trim().max(500)).optional().nullable(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(999_999).optional(),
});

function toPublicBrand(row: {
  id: bigint;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
  _count?: { products: number };
}) {
  return {
    id: row.id.toString(),
    name: row.name,
    slug: row.slug,
    description: row.description,
    is_active: row.is_active,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
    products_count: row._count?.products ?? 0,
  };
}

async function slugTaken(slug: string, excludeId?: bigint) {
  const existing = await prisma.brand.findFirst({
    where: {
      slug,
      deleted_at: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(existing);
}

const brandInclude = {
  _count: {
    select: { products: { where: { deleted_at: null } } },
  },
} as const;

dashboardBrandsRouter.get("/", async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
    });
  }

  const { q, active, page, limit } = parsed.data;
  const where: Prisma.BrandWhereInput = { deleted_at: null };

  if (q) {
    where.OR = [
      { name: { contains: q } },
      { slug: { contains: q } },
      { description: { contains: q } },
    ];
  }
  if (active === "true") where.is_active = true;
  if (active === "false") where.is_active = false;
  if (req.auth!.role === "vendor") where.is_active = true;

  const skip = (page - 1) * limit;
  const [total, rows] = await Promise.all([
    prisma.brand.count({ where }),
    prisma.brand.findMany({
      where,
      include: brandInclude,
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
      skip,
      take: limit,
    }),
  ]);

  return res.json({
    brands: rows.map(toPublicBrand),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

dashboardBrandsRouter.get("/slug-preview", async (req, res) => {
  const name = String(req.query.name ?? "").trim();
  if (name.length < 2) {
    return res.status(400).json({ message: "Name is required" });
  }
  const slug = await uniqueVendorSlug(name, (s) => slugTaken(s));
  return res.json({ slug });
});

dashboardBrandsRouter.get("/:id", async (req, res) => {
  const id = parseId(String(req.params.id));
  if (!id) return res.status(400).json({ message: "Invalid brand id" });

  const row = await prisma.brand.findFirst({
    where: { id, deleted_at: null },
    include: brandInclude,
  });
  if (!row) return res.status(404).json({ message: "Brand not found" });
  if (req.auth!.role === "vendor" && !row.is_active) {
    return res.status(404).json({ message: "Brand not found" });
  }

  return res.json({ brand: toPublicBrand(row) });
});

dashboardBrandsRouter.post("/", async (req, res) => {
  if (!canManage(req.auth!.role)) {
    return res.status(403).json({
      message: "Only super admin, admin, or moderator can create brands",
    });
  }

  const parsed = brandBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;
  const slug = data.slug
    ? (await slugTaken(data.slug)
        ? await uniqueVendorSlug(data.slug, (s) => slugTaken(s))
        : data.slug)
    : await uniqueVendorSlug(data.name, (s) => slugTaken(s));

  const row = await prisma.brand.create({
    data: {
      name: data.name,
      slug,
      description: data.description ?? null,
      is_active: data.is_active ?? true,
      sort_order: data.sort_order ?? 0,
    },
    include: brandInclude,
  });

  return res.status(201).json({
    message: "Brand created",
    brand: toPublicBrand(row),
  });
});

dashboardBrandsRouter.patch("/:id", async (req, res) => {
  if (!canManage(req.auth!.role)) {
    return res.status(403).json({
      message: "Only super admin, admin, or moderator can edit brands",
    });
  }

  const id = parseId(String(req.params.id));
  if (!id) return res.status(400).json({ message: "Invalid brand id" });

  const parsed = brandBodySchema.partial().safeParse(req.body);
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

  const existing = await prisma.brand.findFirst({
    where: { id, deleted_at: null },
  });
  if (!existing) return res.status(404).json({ message: "Brand not found" });

  if (data.slug && (await slugTaken(data.slug, id))) {
    return res.status(409).json({ message: "Slug already in use" });
  }

  const row = await prisma.brand.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug,
      description:
        data.description === undefined ? undefined : data.description,
      is_active: data.is_active,
      sort_order: data.sort_order,
    },
    include: brandInclude,
  });

  // Keep denormalized product.brand in sync when name changes.
  if (data.name && data.name !== existing.name) {
    await prisma.product.updateMany({
      where: { brand_id: id, deleted_at: null },
      data: { brand: data.name },
    });
  }

  return res.json({
    message: "Brand updated",
    brand: toPublicBrand(row),
  });
});

dashboardBrandsRouter.delete("/:id", async (req, res) => {
  if (!canManage(req.auth!.role)) {
    return res.status(403).json({
      message: "Only super admin, admin, or moderator can delete brands",
    });
  }

  const id = parseId(String(req.params.id));
  if (!id) return res.status(400).json({ message: "Invalid brand id" });

  const existing = await prisma.brand.findFirst({
    where: { id, deleted_at: null },
  });
  if (!existing) return res.status(404).json({ message: "Brand not found" });

  const row = await prisma.brand.update({
    where: { id },
    data: { deleted_at: new Date(), is_active: false },
    include: brandInclude,
  });

  return res.json({
    message: "Brand deleted",
    brand: toPublicBrand(row),
  });
});
