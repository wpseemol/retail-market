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
import { brandImageUpload, categoryImageUpload, shopImageUpload } from "../middleware/upload.js";
import {
  brandListQuerySchema,
  createBrandSchema,
  updateBrandSchema,
} from "../validators/brand.js";
import { withSafeInput } from "../validators/customerAuth.js";
import { brandOwnerSchema, updateShowcaseSchema } from "../validators/showcase.js";
import { buildShowcaseUpdate, toDashboardShowcase } from "../lib/showcase.js";
import {
  discardUpload,
  removeStoredMedia,
  SHOWCASE_IMAGE_MAX_BYTES,
  singleImageUpload,
  storeShowcaseImage,
  type ShowcaseImageKind,
} from "../lib/showcaseMedia.js";
import { revalidateFrontend } from "../lib/revalidate.js";

export const dashboardBrandsRouter = Router();

dashboardBrandsRouter.use(
  requireAuth,
  requireRoles("super_admin", "admin", "moderator", "vendor"),
);

const ELEVATED = ["super_admin", "admin", "moderator"] as const;

function canManage(role: string) {
  return (ELEVATED as readonly string[]).includes(role);
}

/** Linked-store assignment and design override: super_admin / admin. */
function canAssignOwner(role: string) {
  return role === "super_admin" || role === "admin";
}

async function actorVendorId(userId: bigint) {
  const vendor = await prisma.vendor.findFirst({
    where: { user_id: userId, deleted_at: null },
    select: { id: true },
  });
  return vendor?.id ?? null;
}

/** super_admin / admin, or the vendor whose store the brand is linked to. Moderators are excluded. */
async function canEditShowcase(
  auth: { role: string; userId: bigint },
  brand: { vendor_id: bigint | null },
) {
  if (canAssignOwner(auth.role)) return true;
  if (auth.role !== "vendor" || !brand.vendor_id) return false;
  return brand.vendor_id === (await actorVendorId(auth.userId));
}

function brandTags(...slugs: (string | null | undefined)[]) {
  const tags = ["brands"];
  for (const slug of slugs) if (slug) tags.push(`brand:${slug}`);
  return tags;
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
  banner?: Parameters<typeof toPublicMedia>[0];
  vendor_id?: bigint | null;
  vendor?: { id: bigint; shop_name: string; slug: string } | null;
  tagline?: string | null;
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
    banner: toPublicMedia(row.banner),
    tagline: row.tagline ?? null,
    vendor_id: row.vendor_id?.toString() ?? null,
    vendor: row.vendor
      ? { id: row.vendor.id.toString(), shop_name: row.vendor.shop_name, slug: row.vendor.slug }
      : null,
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
  banner: true,
  vendor: { select: { id: true, shop_name: true, slug: true } },
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

  const { q, active, page, limit, mine } = parsed.data;
  const where: Prisma.BrandWhereInput = { deleted_at: null };

  if (mine === "1") {
    if (req.auth!.role !== "vendor") {
      return res.status(400).json({ message: "`mine=1` is only for vendor accounts" });
    }
    const vendorId = await actorVendorId(req.auth!.userId);
    if (!vendorId) {
      return res.json({ brands: [], pagination: { page, limit, total: 0, pages: 0 } });
    }
    where.vendor_id = vendorId;
  }

  if (q) {
    where.OR = [
      { name: { contains: q } },
      { slug: { contains: q } },
      { description: { contains: q } },
    ];
  }
  if (active === "true") where.is_active = true;
  if (active === "false") where.is_active = false;
  if (req.auth!.role === "vendor" && mine !== "1") where.is_active = true;

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
  const canShowcase = await canEditShowcase(req.auth!, row);
  if (req.auth!.role === "vendor" && !row.is_active && !canShowcase) {
    return res.status(404).json({ message: "Brand not found" });
  }

  return res.json({
    brand: toPublicBrand(row),
    permissions: {
      manage: canManage(req.auth!.role),
      assign_owner: canAssignOwner(req.auth!.role),
      showcase: canShowcase,
    },
  });
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

/** Upload / replace brand logo — elevated or the linked store's vendor. Max 1 MB; resized server-side. */
dashboardBrandsRouter.post(
  "/:id/image",
  (req, res, next) => {
    if (!canManage(req.auth!.role) && req.auth!.role !== "vendor") {
      return res.status(403).json({
        message:
          "Only super admin, admin, moderator, or the linked store can set brand images",
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
    if (!canManage(req.auth!.role) && !(await canEditShowcase(req.auth!, existing))) {
      discardUpload(file);
      return res.status(403).json({
        message: "You can only change logos of brands linked to your store",
      });
    }

    const finalized = await finalizeCategoryImageUpload(
      file.path,
      file.mimetype,
      "brand",
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

      revalidateFrontend(brandTags(row.slug));
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

  revalidateFrontend(brandTags(existing.slug, row.slug));
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

  revalidateFrontend(brandTags(existing.slug));
  return res.json({
    message: "Brand deleted",
    brand: toPublicBrand(row),
  });
});

/** Link a brand to one store (its vendor may then edit the brand page), or unlink with `null`. */
dashboardBrandsRouter.patch("/:id/owner", async (req, res) => {
  if (!canAssignOwner(req.auth!.role)) {
    return res.status(403).json({ message: "Only super admin or admin can link brands to stores" });
  }
  const id = parseId(String(req.params.id));
  if (!id) return res.status(400).json({ message: "Invalid brand id" });

  const parsed = brandOwnerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const existing = await prisma.brand.findFirst({
    where: { id, deleted_at: null },
    include: { vendor: { select: { slug: true } } },
  });
  if (!existing) return res.status(404).json({ message: "Brand not found" });

  let vendorId: bigint | null = null;
  let vendorSlug: string | null = null;
  if (parsed.data.vendor_id) {
    const vendor = await prisma.vendor.findFirst({
      where: { id: BigInt(parsed.data.vendor_id), deleted_at: null },
      select: { id: true, slug: true },
    });
    if (!vendor) return res.status(404).json({ message: "Store not found" });
    vendorId = vendor.id;
    vendorSlug = vendor.slug;
  }

  const row = await prisma.brand.update({
    where: { id },
    data: { vendor_id: vendorId },
    include: brandInclude,
  });

  revalidateFrontend([
    ...brandTags(row.slug),
    "stores",
    ...(existing.vendor?.slug ? [`store:${existing.vendor.slug}`] : []),
    ...(vendorSlug ? [`store:${vendorSlug}`] : []),
  ]);
  return res.json({
    message: vendorId ? "Brand linked to store" : "Brand unlinked from store",
    brand: toPublicBrand(row),
  });
});

const showcaseBrandInclude = { og_image: true, banner: true, image: true } as const;

async function loadShowcaseBrand(
  req: import("express").Request,
  res: import("express").Response,
) {
  const id = parseId(String(req.params.id));
  if (!id) {
    res.status(400).json({ message: "Invalid brand id" });
    return null;
  }
  const brand = await prisma.brand.findFirst({
    where: { id, deleted_at: null },
    include: showcaseBrandInclude,
  });
  if (!brand) {
    res.status(404).json({ message: "Brand not found" });
    return null;
  }
  if (!(await canEditShowcase(req.auth!, brand))) {
    res.status(403).json({
      message: "Only super admin, admin, or the linked store can customize this brand page",
    });
    return null;
  }
  return brand;
}

function brandShowcasePayload(brand: NonNullable<Awaited<ReturnType<typeof loadShowcaseBrand>>>) {
  return {
    id: brand.id.toString(),
    slug: brand.slug,
    name: brand.name,
    image: toPublicMedia(brand.image),
    banner: toPublicMedia(brand.banner),
    ...toDashboardShowcase(brand),
  };
}

dashboardBrandsRouter.get("/:id/showcase", async (req, res) => {
  const brand = await loadShowcaseBrand(req, res);
  if (!brand) return;
  return res.json({ showcase: brandShowcasePayload(brand) });
});

dashboardBrandsRouter.patch("/:id/showcase", async (req, res) => {
  const parsed = updateShowcaseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  const existing = await loadShowcaseBrand(req, res);
  if (!existing) return;

  const { data } = buildShowcaseUpdate(existing, parsed.data);
  const brand = await prisma.brand.update({
    where: { id: existing.id },
    data,
    include: showcaseBrandInclude,
  });

  revalidateFrontend(brandTags(brand.slug));
  return res.json({ message: "Brand page saved", showcase: brandShowcasePayload(brand) });
});

const BRAND_MEDIA: Record<
  ShowcaseImageKind,
  { field: "og_image_id" | "banner_id"; relation: "og_image" | "banner"; label: string }
> = {
  og: { field: "og_image_id", relation: "og_image", label: "Share image" },
  brandBanner: { field: "banner_id", relation: "banner", label: "Banner" },
};

function brandImageRoutes(route: string, kind: ShowcaseImageKind, field: string) {
  const meta = BRAND_MEDIA[kind];
  const upload = kind === "og" ? categoryImageUpload : shopImageUpload;

  dashboardBrandsRouter.post(
    `/:id/${route}`,
    singleImageUpload(upload, field, meta.label, SHOWCASE_IMAGE_MAX_BYTES[kind], kind === "og" ? "OG_IMAGE" : "BANNER"),
    async (req, res) => {
      const existing = await loadShowcaseBrand(req, res);
      if (!existing) {
        discardUpload(req.file);
        return;
      }
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: `${meta.label} is required (field: ${field})` });
      }

      const stored = await storeShowcaseImage({
        file,
        kind,
        actorId: req.auth!.userId,
        altText: kind === "og" ? existing.name : `${existing.name} banner`,
        mediableType: "Brand",
        mediableId: existing.id,
      });
      if (!stored.ok) {
        return res.status(400).json({ message: stored.message, code: stored.code });
      }

      const brand = await prisma.brand.update({
        where: { id: existing.id },
        data: { [meta.field]: stored.media.id },
        include: showcaseBrandInclude,
      });
      const previous = existing[meta.relation];
      if (previous && previous.id !== stored.media.id) await removeStoredMedia(previous);

      revalidateFrontend(brandTags(brand.slug));
      return res.json({ message: `${meta.label} updated`, showcase: brandShowcasePayload(brand) });
    },
  );

  dashboardBrandsRouter.delete(`/:id/${route}`, async (req, res) => {
    const existing = await loadShowcaseBrand(req, res);
    if (!existing) return;
    const previous = existing[meta.relation];
    if (!previous) {
      return res.status(404).json({ message: `This brand has no ${meta.label.toLowerCase()}` });
    }

    const brand = await prisma.brand.update({
      where: { id: existing.id },
      data: { [meta.field]: null },
      include: showcaseBrandInclude,
    });
    await removeStoredMedia(previous);

    revalidateFrontend(brandTags(brand.slug));
    return res.json({ message: `${meta.label} removed`, showcase: brandShowcasePayload(brand) });
  });
}

/** Brand page banner — field `banner`, 5 MB, resized to 1920×640. */
brandImageRoutes("banner", "brandBanner", "banner");
/** Brand share (Open Graph) image — field `image`, 1 MB, resized to 1200×630. */
brandImageRoutes("og-image", "og", "image");
