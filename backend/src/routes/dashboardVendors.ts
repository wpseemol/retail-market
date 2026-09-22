import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import { z } from "zod";
import type { Prisma, UserStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  toPublicMedia,
  toPublicUser,
  userWithAvatarInclude,
} from "../lib/user.js";
import { slugify, uniqueVendorSlug } from "../lib/slug.js";
import {
  finalizeShopImageUpload,
  sanitizeOriginalName,
  SHOP_IMAGES_DIR,
  SHOP_IMAGES_RELATIVE,
} from "../lib/shopImage.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { shopImageUpload } from "../middleware/upload.js";
import { findUnsafeInputReason } from "../validators/customerAuth.js";

export const dashboardVendorsRouter = Router();

dashboardVendorsRouter.use(
  requireAuth,
  requireRoles("super_admin", "vendor"),
);

function withSafeInput(schema: z.ZodString) {
  return schema.superRefine((value, ctx) => {
    const reason = findUnsafeInputReason(value);
    if (reason) ctx.addIssue({ code: "custom", message: reason });
  });
}

const SHOP_STATUSES: UserStatus[] = [
  "active",
  "inactive",
  "pending",
  "suspended",
  "banned",
];

const createShopSchema = z.object({
  shop_name: withSafeInput(z.string().trim().min(2).max(200)),
  slug: withSafeInput(
    z
      .string()
      .trim()
      .min(2)
      .max(220)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must be lowercase letters, numbers, and hyphens",
      ),
  ).optional(),
  description: withSafeInput(z.string().trim().max(5000)).optional().nullable(),
  user_id: z.string().regex(/^\d+$/).optional(),
  status: z.enum(SHOP_STATUSES as [UserStatus, ...UserStatus[]]).optional(),
});

const updateShopSchema = z.object({
  shop_name: withSafeInput(z.string().trim().min(2).max(200)).optional(),
  slug: withSafeInput(
    z
      .string()
      .trim()
      .min(2)
      .max(220)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must be lowercase letters, numbers, and hyphens",
      ),
  ).optional(),
  description: withSafeInput(z.string().trim().max(5000)).optional().nullable(),
  status: z.enum(SHOP_STATUSES as [UserStatus, ...UserStatus[]]).optional(),
  user_id: z.string().regex(/^\d+$/).optional(),
});

const shopInclude = {
  user: { include: userWithAvatarInclude },
  logo: true,
} as const;

type ChangeMap = Record<string, { from: unknown; to: unknown }>;

async function recordHistory(input: {
  vendorId: bigint;
  actorId: bigint;
  action: string;
  changes?: ChangeMap | null;
  note?: string | null;
}) {
  await prisma.vendorHistory.create({
    data: {
      vendor_id: input.vendorId,
      actor_id: input.actorId,
      action: input.action,
      changes: (input.changes ?? undefined) as Prisma.InputJsonValue | undefined,
      note: input.note ?? null,
    },
  });
}

function toPublicShop(
  vendor: {
    id: bigint;
    user_id: bigint;
    logo_id?: bigint | null;
    shop_name: string;
    slug: string;
    description: string | null;
    status: UserStatus;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    logo?: Parameters<typeof toPublicMedia>[0];
    user?: Parameters<typeof toPublicUser>[0];
  },
) {
  return {
    id: vendor.id.toString(),
    user_id: vendor.user_id.toString(),
    logo_id: vendor.logo_id?.toString() ?? null,
    shop_name: vendor.shop_name,
    slug: vendor.slug,
    description: vendor.description,
    status: vendor.status,
    created_at: vendor.created_at,
    updated_at: vendor.updated_at,
    logo: toPublicMedia(vendor.logo),
    user: vendor.user ? toPublicUser(vendor.user) : undefined,
  };
}

function parseId(raw: string) {
  if (!/^\d+$/.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

async function slugTaken(slug: string, excludeId?: bigint) {
  const existing = await prisma.vendor.findFirst({
    where: {
      slug,
      deleted_at: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(existing);
}

async function assertCanAccessShop(
  vendor: { user_id: bigint },
  actorId: bigint,
  role: string,
) {
  if (role === "super_admin") return true;
  return vendor.user_id === actorId;
}

dashboardVendorsRouter.get("/slug-preview", async (req, res) => {
  const name = String(req.query.name ?? "").trim();
  if (name.length < 2) {
    return res.status(400).json({ message: "Shop name is required" });
  }

  const excludeId = req.query.exclude_id
    ? parseId(String(req.query.exclude_id))
    : null;

  const slug = await uniqueVendorSlug(name, (s) =>
    slugTaken(s, excludeId ?? undefined),
  );
  return res.json({
    slug,
    base: slugify(name) || "shop",
  });
});

dashboardVendorsRouter.get("/", async (req, res) => {
  const isSuper = req.auth!.role === "super_admin";
  const q = String(req.query.q ?? "").trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  const where: Prisma.VendorWhereInput = {
    deleted_at: null,
    ...(isSuper ? {} : { user_id: req.auth!.userId }),
  };

  if (q) {
    where.OR = [
      { shop_name: { contains: q } },
      { slug: { contains: q } },
      { description: { contains: q } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.vendor.count({ where }),
    prisma.vendor.findMany({
      where,
      include: shopInclude,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return res.json({
    shops: rows.map(toPublicShop),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

dashboardVendorsRouter.get("/me", async (req, res) => {
  const vendor = await prisma.vendor.findFirst({
    where: { user_id: req.auth!.userId, deleted_at: null },
    include: shopInclude,
  });

  return res.json({
    shop: vendor ? toPublicShop(vendor) : null,
  });
});

dashboardVendorsRouter.get("/:id/history", async (req, res) => {
  const id = parseId(String(req.params.id));
  if (!id) return res.status(400).json({ message: "Invalid shop id" });

  const vendor = await prisma.vendor.findFirst({
    where: { id },
  });
  if (!vendor || vendor.deleted_at) {
    return res.status(404).json({ message: "Shop not found" });
  }
  if (
    !(await assertCanAccessShop(vendor, req.auth!.userId, req.auth!.role))
  ) {
    return res.status(403).json({ message: "Insufficient permissions" });
  }

  const rows = await prisma.vendorHistory.findMany({
    where: { vendor_id: id },
    include: {
      actor: { include: userWithAvatarInclude },
    },
    orderBy: { created_at: "desc" },
    take: 100,
  });

  return res.json({
    history: rows.map((row) => ({
      id: row.id.toString(),
      action: row.action,
      changes: row.changes,
      note: row.note,
      created_at: row.created_at,
      actor: row.actor ? toPublicUser(row.actor) : null,
    })),
  });
});

dashboardVendorsRouter.get("/:id", async (req, res) => {
  const id = parseId(String(req.params.id));
  if (!id) return res.status(400).json({ message: "Invalid shop id" });

  const vendor = await prisma.vendor.findFirst({
    where: { id, deleted_at: null },
    include: shopInclude,
  });

  if (!vendor) return res.status(404).json({ message: "Shop not found" });

  if (
    !(await assertCanAccessShop(vendor, req.auth!.userId, req.auth!.role))
  ) {
    return res.status(403).json({ message: "Insufficient permissions" });
  }

  return res.json({ shop: toPublicShop(vendor) });
});

dashboardVendorsRouter.post("/", async (req, res) => {
  const parsed = createShopSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const isSuper = req.auth!.role === "super_admin";
  const data = parsed.data;
  let ownerId = req.auth!.userId;

  if (isSuper && data.user_id) {
    ownerId = BigInt(data.user_id);
    const owner = await prisma.user.findFirst({
      where: { id: ownerId, deleted_at: null },
    });
    if (!owner) {
      return res.status(404).json({ message: "Owner user not found" });
    }
    if (owner.role !== "vendor" && owner.role !== "super_admin") {
      return res.status(400).json({
        message: "Shop owner must be a vendor (or assign to yourself)",
      });
    }
  } else if (!isSuper && data.user_id) {
    return res.status(403).json({
      message: "Vendors can only create a shop for themselves",
    });
  }

  const existing = await prisma.vendor.findFirst({
    where: { user_id: ownerId, deleted_at: null },
  });
  if (existing) {
    return res.status(409).json({
      message: "This user already has a shop",
      shop: toPublicShop(existing),
    });
  }

  const slug = data.slug
    ? (await slugTaken(data.slug)
        ? await uniqueVendorSlug(data.slug, (s) => slugTaken(s))
        : data.slug)
    : await uniqueVendorSlug(data.shop_name, (s) => slugTaken(s));

  const status =
    isSuper && data.status ? data.status : isSuper ? "active" : "pending";

  const vendor = await prisma.vendor.create({
    data: {
      user_id: ownerId,
      shop_name: data.shop_name,
      slug,
      description: data.description ?? null,
      status,
    },
    include: shopInclude,
  });

  if (isSuper && vendor.user?.role === "customer") {
    await prisma.user.update({
      where: { id: ownerId },
      data: { role: "vendor" },
    });
  }

  await recordHistory({
    vendorId: vendor.id,
    actorId: req.auth!.userId,
    action: "created",
    changes: {
      shop_name: { from: null, to: vendor.shop_name },
      slug: { from: null, to: vendor.slug },
      status: { from: null, to: vendor.status },
      user_id: { from: null, to: vendor.user_id.toString() },
    },
  });

  return res.status(201).json({
    message: "Shop created",
    shop: toPublicShop(vendor),
  });
});

dashboardVendorsRouter.patch("/:id", async (req, res) => {
  const id = parseId(String(req.params.id));
  if (!id) return res.status(400).json({ message: "Invalid shop id" });

  const parsed = updateShopSchema.safeParse(req.body);
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

  const existing = await prisma.vendor.findFirst({
    where: { id, deleted_at: null },
  });
  if (!existing) return res.status(404).json({ message: "Shop not found" });

  const isSuper = req.auth!.role === "super_admin";
  if (
    !(await assertCanAccessShop(existing, req.auth!.userId, req.auth!.role))
  ) {
    return res.status(403).json({ message: "Insufficient permissions" });
  }

  if (!isSuper && (data.status !== undefined || data.user_id !== undefined)) {
    return res.status(403).json({
      message: "Only super admin can change shop status or owner",
    });
  }

  let nextUserId: bigint | undefined;
  if (isSuper && data.user_id) {
    nextUserId = BigInt(data.user_id);
    if (nextUserId !== existing.user_id) {
      const owner = await prisma.user.findFirst({
        where: { id: nextUserId, deleted_at: null },
      });
      if (!owner) {
        return res.status(404).json({ message: "Owner user not found" });
      }
      const conflict = await prisma.vendor.findFirst({
        where: {
          user_id: nextUserId,
          deleted_at: null,
          NOT: { id },
        },
      });
      if (conflict) {
        return res.status(409).json({
          message: "That user already owns another shop",
        });
      }
    }
  }

  if (data.slug && (await slugTaken(data.slug, id))) {
    return res.status(409).json({ message: "Slug already in use" });
  }

  const changes: ChangeMap = {};
  if (data.shop_name !== undefined && data.shop_name !== existing.shop_name) {
    changes.shop_name = { from: existing.shop_name, to: data.shop_name };
  }
  if (data.slug !== undefined && data.slug !== existing.slug) {
    changes.slug = { from: existing.slug, to: data.slug };
  }
  if (
    data.description !== undefined &&
    data.description !== existing.description
  ) {
    changes.description = {
      from: existing.description,
      to: data.description,
    };
  }
  if (isSuper && data.status !== undefined && data.status !== existing.status) {
    changes.status = { from: existing.status, to: data.status };
  }
  if (
    nextUserId !== undefined &&
    nextUserId !== existing.user_id
  ) {
    changes.user_id = {
      from: existing.user_id.toString(),
      to: nextUserId.toString(),
    };
  }

  const vendor = await prisma.vendor.update({
    where: { id },
    data: {
      shop_name: data.shop_name,
      slug: data.slug,
      description:
        data.description === undefined ? undefined : data.description,
      status: isSuper ? data.status : undefined,
      user_id: nextUserId,
    },
    include: shopInclude,
  });

  if (Object.keys(changes).length > 0) {
    await recordHistory({
      vendorId: id,
      actorId: req.auth!.userId,
      action: "updated",
      changes,
    });
  }

  return res.json({
    message: "Shop updated",
    shop: toPublicShop(vendor),
  });
});

/** Upload / replace shop logo (store image). */
dashboardVendorsRouter.post(
  "/:id/logo",
  (req, res, next) => {
    shopImageUpload.single("logo")(req, res, (err) => {
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
    if (!id) return res.status(400).json({ message: "Invalid shop id" });

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        message: "Shop image is required (field: logo)",
      });
    }

    const existing = await prisma.vendor.findFirst({
      where: { id, deleted_at: null },
      include: { logo: true },
    });
    if (!existing) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        /* ignore */
      }
      return res.status(404).json({ message: "Shop not found" });
    }

    if (
      !(await assertCanAccessShop(existing, req.auth!.userId, req.auth!.role))
    ) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        /* ignore */
      }
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const finalized = finalizeShopImageUpload(file.path, file.mimetype);
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
          file_path: SHOP_IMAGES_RELATIVE,
          file_size: BigInt(finalized.size),
          mime_type: finalized.detected.mime,
          alt_text: existing.shop_name.slice(0, 255),
          collection_name: "vendor_banners",
          is_public: true,
          mediable_type: "Vendor",
          mediable_id: id,
          sort_order: 0,
        },
      });

      const vendor = await prisma.vendor.update({
        where: { id },
        data: { logo_id: media.id },
        include: shopInclude,
      });

      await recordHistory({
        vendorId: id,
        actorId: req.auth!.userId,
        action: "logo_changed",
        changes: {
          logo_id: {
            from: existing.logo_id?.toString() ?? null,
            to: media.id.toString(),
          },
          logo_file: {
            from: existing.logo?.file_name ?? null,
            to: media.file_name,
          },
        },
      });

      if (existing.logo && existing.logo.id !== media.id) {
        const oldPath = path.join(SHOP_IMAGES_DIR, existing.logo.file_name);
        try {
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } catch {
          /* ignore */
        }
        await prisma.media
          .delete({ where: { id: existing.logo.id } })
          .catch(() => undefined);
      }

      return res.json({
        message: "Shop image updated",
        shop: toPublicShop(vendor),
      });
    } catch (err) {
      try {
        fs.unlinkSync(finalized.absolutePath);
      } catch {
        /* ignore */
      }
      throw err;
    }
  },
);

/** Soft-delete shop — super admin only. */
dashboardVendorsRouter.delete("/:id", async (req, res) => {
  if (req.auth!.role !== "super_admin") {
    return res.status(403).json({ message: "Only super admin can delete shops" });
  }

  const id = parseId(String(req.params.id));
  if (!id) return res.status(400).json({ message: "Invalid shop id" });

  const existing = await prisma.vendor.findFirst({
    where: { id, deleted_at: null },
  });
  if (!existing) return res.status(404).json({ message: "Shop not found" });

  const vendor = await prisma.vendor.update({
    where: { id },
    data: { deleted_at: new Date(), status: "inactive" },
    include: shopInclude,
  });

  await recordHistory({
    vendorId: id,
    actorId: req.auth!.userId,
    action: "deleted",
    changes: {
      deleted_at: { from: null, to: vendor.deleted_at?.toISOString() ?? null },
      status: { from: existing.status, to: "inactive" },
    },
    note: "Shop soft-deleted by super admin",
  });

  return res.json({
    message: "Shop deleted",
    shop: toPublicShop(vendor),
  });
});
