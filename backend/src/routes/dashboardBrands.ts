import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import {
  finalizeCategoryImageUpload,
  CATEGORY_IMAGE_MAX_BYTES,
  PRODUCT_IMAGES_RELATIVE,
  sanitizeOriginalName,
} from "../lib/categoryImage.js";
import { PRODUCT_IMAGES_DIR } from "../lib/productImage.js";
import { prisma } from "../lib/prisma.js";
import { uniqueVendorSlug } from "../lib/slug.js";
import { toPublicMedia } from "../lib/user.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { brandImageUpload } from "../middleware/upload.js";
import {
  brandListQuerySchema,
  createBrandSchema,
  updateBrandSchema,
} from "../validators/brand.js";
import { withSafeInput } from "../validators/customerAuth.js";

export const dashboardBrandsRouter = Router();

dashboardBrandsRouter.use(
  requireAuth,
  requireRoles("super_admin", "admin", "moderator", "vendor"),
);

const ELEVATED = ["super_admin", "admin", "moderator"] as const;

function canManage(role: string) {
  return (ELEVATED as readonly string[]).includes(role);
}

function parseId(raw: string) {
  if (!/^\d+$/.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function toPublicBrand(row: {
  id: bigint;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
  image_id?: bigint | null;
  image?: Parameters<typeof toPublicMedia>[0];
  _count?: { products: number };
}) {
  return {
    id: row.id.toString(),
    name: row.name,
    slug: row.slug,
    description: row.description,
    is_active: row.is_active,
    sort_order: row.sort_order,
    image_id: row.image_id?.toString() ?? null,
    image: toPublicMedia(row.image),
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
  image: true,
  _count: {
    select: { products: { where: { deleted_at: null } } },
  },
} as const;

dashboardBrandsRouter.get("/", async (req, res) => {
  const parsed = brandListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
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
  const parsed = z
    .object({
      name: withSafeInput(z.string().trim().min(2).max(120)),
    })
    .safeParse({ name: String(req.query.name ?? "") });
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Name is required",
    });
  }
  const slug = await uniqueVendorSlug(parsed.data.name, (s) => slugTaken(s));
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

  const parsed = createBrandSchema.safeParse(req.body);
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

/** Upload / replace brand logo — elevated only. Max 1 MB; resized server-side. */
dashboardBrandsRouter.post(
  "/:id/image",
  (req, res, next) => {
    if (!canManage(req.auth!.role)) {
      return res.status(403).json({
        message:
          "Only super admin, admin, or moderator can set brand images",
      });
    }
    brandImageUpload.single("image")(req, res, (err) => {
      if (err) {
        const isTooLarge =
          err instanceof Error &&
          ("code" in err
            ? (err as { code?: string }).code === "LIMIT_FILE_SIZE"
            : /file too large|File too large/i.test(err.message));
        return res.status(400).json({
          message: isTooLarge
            ? `Brand image must be ${Math.floor(CATEGORY_IMAGE_MAX_BYTES / (1024 * 1024))} MB or smaller`
            : err instanceof Error
              ? err.message
              : "Upload failed",
          code: isTooLarge ? "BRAND_IMAGE_TOO_LARGE" : undefined,
        });
      }
      return next();
    });
  },
  async (req, res) => {
    const id = parseId(String(req.params.id));
    if (!id) return res.status(400).json({ message: "Invalid brand id" });

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        message: "Brand image is required (field: image)",
      });
    }

    const existing = await prisma.brand.findFirst({
      where: { id, deleted_at: null },
      include: { image: true },
    });
    if (!existing) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        /* ignore */
      }
      return res.status(404).json({ message: "Brand not found" });
    }

    const finalized = await finalizeCategoryImageUpload(
      file.path,
      file.mimetype,
    );
    if (!finalized.ok) {
      return res.status(400).json({
        message: finalized.message.replace(/^Category/i, "Brand"),
        code: finalized.code?.replace(/^CATEGORY_/, "BRAND_"),
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
          mediable_type: "Brand",
          mediable_id: id,
          sort_order: 0,
        },
      });

      const row = await prisma.brand.update({
        where: { id },
        data: { image_id: media.id },
        include: brandInclude,
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
        message: "Brand image updated",
        brand: toPublicBrand(row),
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

dashboardBrandsRouter.patch("/:id", async (req, res) => {
  if (!canManage(req.auth!.role)) {
    return res.status(403).json({
      message: "Only super admin, admin, or moderator can edit brands",
    });
  }

  const id = parseId(String(req.params.id));
  if (!id) return res.status(400).json({ message: "Invalid brand id" });

  const parsed = updateBrandSchema.safeParse(req.body);
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
