import { Router } from "express";
import { currentMediaDisk } from "../config/storage.config.js";
import { z } from "zod";
import type { Prisma, UserStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { parseBigIntId } from "../utils/ids.js";
import {
  toPublicMedia,
  toPublicUser,
  userWithAvatarInclude,
} from "../lib/user.js";
import { slugify, uniqueVendorSlug } from "../lib/slug.js";
import {
  finalizeShopImageUpload,
  sanitizeOriginalName,
  SHOP_IMAGES_RELATIVE,
} from "../lib/shopImage.js";
import { deleteMediaFile } from "../lib/storage/files.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { categoryImageUpload, discardTempUpload, shopImageUpload, uploadBytes } from "../middleware/upload.js";
import { findUnsafeInputReason } from "../validators/customerAuth.js";
import { updateShowcaseSchema } from "../validators/showcase.js";
import { buildShowcaseUpdate, toDashboardShowcase } from "../lib/showcase.js";
import {
  discardUpload,
  removeStoredMedia,
  SHOWCASE_IMAGE_MAX_BYTES,
  singleImageUpload,
  storeShowcaseImage,
} from "../lib/showcaseMedia.js";
import { revalidateFrontend } from "../lib/revalidate.js";
import {
  actorStoreIds,
  canAccessShop,
  VENDOR_HELPER_MAX,
  VENDOR_MEMBER_MAX,
} from "../lib/vendorAccess.js";

export const dashboardVendorsRouter = Router();

/** Admins/moderators manage teams; super_admin owns fees; vendors use membership. */
dashboardVendorsRouter.use(
  requireAuth,
  requireRoles("super_admin", "admin", "moderator", "vendor"),
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

/** Create flow: draft → pending, publish → active. */
const CREATE_SHOP_STATUSES = ["pending", "active"] as const;

const STOREFRONT_THEMES = ["classic", "marketplace", "showcase"] as const;
const PRODUCT_SORTS = [
  "featured_first",
  "newest",
  "price_asc",
  "price_desc",
] as const;

/** Optional Bangla copy; empty string or null clears it. */
const bnFields = {
  shop_name_bn: z
    .union([withSafeInput(z.string().trim().max(200)), z.null()])
    .transform((v) => (v ? v : null))
    .optional(),
  description_bn: z
    .union([withSafeInput(z.string().trim().max(5000)), z.null()])
    .transform((v) => (v ? v : null))
    .optional(),
};

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
  ...bnFields,
  user_id: z.string().regex(/^\d+$/).optional(),
  status: z.enum(CREATE_SHOP_STATUSES).optional(),
});

const FEE_PLANS = ["commission", "rent", "both"] as const;
const RENT_PERIODS = ["monthly", "yearly"] as const;

const feeFieldsSchema = z
  .object({
    fee_plan: z.enum(FEE_PLANS).optional(),
    commission_percent: z
      .number()
      .finite()
      .min(0)
      .max(100)
      .nullable()
      .optional(),
    rent_amount: z.number().finite().min(0).max(10_000_000).nullable().optional(),
    rent_period: z.enum(RENT_PERIODS).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const plan = data.fee_plan;
    if (!plan && data.commission_percent === undefined && data.rent_amount === undefined) {
      return;
    }
    const effective = plan ?? "commission";
    if (
      (effective === "commission" || effective === "both") &&
      data.commission_percent === null
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["commission_percent"],
        message: "Commission percent is required for this fee plan",
      });
    }
    if (effective === "rent" || effective === "both") {
      if (data.rent_amount === null) {
        ctx.addIssue({
          code: "custom",
          path: ["rent_amount"],
          message: "Rent amount is required for this fee plan",
        });
      }
      if (data.rent_period === null) {
        ctx.addIssue({
          code: "custom",
          path: ["rent_period"],
          message: "Rent period is required for this fee plan",
        });
      }
    }
  });

const updateShopSchema = z
  .object({
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
    ...bnFields,
    status: z.enum(SHOP_STATUSES as [UserStatus, ...UserStatus[]]).optional(),
    user_id: z.string().regex(/^\d+$/).optional(),
    storefront_theme: z.enum(STOREFRONT_THEMES).optional(),
    products_per_page: z.coerce.number().int().min(4).max(48).optional(),
    featured_products_count: z.coerce.number().int().min(0).max(12).optional(),
    show_banned_brands: z.boolean().optional(),
    product_sort: z.enum(PRODUCT_SORTS).optional(),
    fee_plan: z.enum(FEE_PLANS).optional(),
    commission_percent: z
      .number()
      .finite()
      .min(0)
      .max(100)
      .nullable()
      .optional(),
    rent_amount: z
      .number()
      .finite()
      .min(0)
      .max(10_000_000)
      .nullable()
      .optional(),
    rent_period: z.enum(RENT_PERIODS).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const feeParsed = feeFieldsSchema.safeParse(data);
    if (!feeParsed.success) {
      for (const issue of feeParsed.error.issues) {
        ctx.addIssue(issue);
      }
    }
  });

const addMemberSchema = z.object({
  user_id: z.string().regex(/^\d+$/, "Select a vendor user"),
});

const shopInclude = {
  user: { include: userWithAvatarInclude },
  logo: true,
  banner: true,
  members: {
    include: { user: { include: userWithAvatarInclude } },
    orderBy: [{ role: "asc" as const }, { id: "asc" as const }],
  },
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

function money(value: { toString(): string } | number | null | undefined) {
  if (value === null || value === undefined) return null;
  return Number(value);
}

function toPublicShop(
  vendor: {
    id: bigint;
    user_id: bigint;
    logo_id?: bigint | null;
    banner_id?: bigint | null;
    shop_name: string;
    shop_name_bn: string | null;
    slug: string;
    description: string | null;
    description_bn: string | null;
    status: UserStatus;
    storefront_theme?: string;
    products_per_page?: number;
    featured_products_count?: number;
    show_banned_brands?: boolean;
    product_sort?: string;
    fee_plan?: string;
    commission_percent?: { toString(): string } | number | null;
    rent_amount?: { toString(): string } | number | null;
    rent_period?: string | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    logo?: Parameters<typeof toPublicMedia>[0];
    banner?: Parameters<typeof toPublicMedia>[0];
    user?: Parameters<typeof toPublicUser>[0];
    members?: Array<{
      id: bigint;
      role: string;
      user_id: bigint;
      created_at: Date;
      user?: Parameters<typeof toPublicUser>[0];
    }>;
  },
) {
  return {
    id: vendor.id.toString(),
    user_id: vendor.user_id.toString(),
    logo_id: vendor.logo_id?.toString() ?? null,
    banner_id: vendor.banner_id?.toString() ?? null,
    shop_name: vendor.shop_name,
    shop_name_bn: vendor.shop_name_bn,
    slug: vendor.slug,
    description: vendor.description,
    description_bn: vendor.description_bn,
    status: vendor.status,
    storefront_theme: vendor.storefront_theme ?? "classic",
    products_per_page: vendor.products_per_page ?? 12,
    featured_products_count: vendor.featured_products_count ?? 4,
    show_banned_brands: vendor.show_banned_brands ?? true,
    product_sort: vendor.product_sort ?? "featured_first",
    fee_plan: vendor.fee_plan ?? "commission",
    commission_percent: money(vendor.commission_percent ?? null),
    rent_amount: money(vendor.rent_amount ?? null),
    rent_period: vendor.rent_period ?? null,
    created_at: vendor.created_at,
    updated_at: vendor.updated_at,
    logo: toPublicMedia(vendor.logo),
    banner: toPublicMedia(vendor.banner),
    user: vendor.user ? toPublicUser(vendor.user) : undefined,
    members: (vendor.members ?? []).map((m) => ({
      id: m.id.toString(),
      role: m.role,
      user_id: m.user_id.toString(),
      created_at: m.created_at,
      user: m.user ? toPublicUser(m.user) : undefined,
    })),
  };
}

const parseId = parseBigIntId;

const SLUG_PARAM_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function vendorWhere(
  idOrSlug: string,
  includeDeleted?: boolean,
): Prisma.VendorWhereInput | null {
  const raw = idOrSlug.trim();
  if (!raw) return null;
  const deletedFilter = includeDeleted ? {} : { deleted_at: null };
  const id = parseId(raw);
  if (id) return { id, ...deletedFilter };
  if (!SLUG_PARAM_RE.test(raw)) return null;
  return { slug: raw, ...deletedFilter };
}

/** Resolve store by numeric id or unique slug. */
async function findVendorByIdOrSlug(
  idOrSlug: string,
  options?: { includeDeleted?: boolean },
) {
  const where = vendorWhere(idOrSlug, options?.includeDeleted);
  if (!where) return null;
  return prisma.vendor.findFirst({ where });
}

async function findVendorWithMedia(
  idOrSlug: string,
  options?: { includeDeleted?: boolean },
) {
  const where = vendorWhere(idOrSlug, options?.includeDeleted);
  if (!where) return null;
  return prisma.vendor.findFirst({
    where,
    include: shopInclude,
  });
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

/**
 * `read` / `design`: owner, helper, admin, super_admin (moderator: read for team mgmt).
 * `manage`: owner or super_admin only (helpers cannot change store settings).
 */
async function assertCanAccessShop(
  vendor: { id: bigint; user_id: bigint },
  actorId: bigint,
  role: string,
  mode: "read" | "design" | "manage" = "manage",
) {
  return canAccessShop(vendor, actorId, role, mode);
}

function shopAccessDeniedMessage(role: string) {
  return role === "vendor" ? "This is not your store" : "Insufficient permissions";
}

function storeTags(...slugs: string[]) {
  return ["stores", "brands", ...slugs.map((s) => `store:${s}`)];
}

const shopListQuerySchema = z.object({
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
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

dashboardVendorsRouter.get("/slug-preview", async (req, res) => {
  const parsed = z
    .object({
      name: withSafeInput(z.string().trim().min(2).max(200)),
    })
    .safeParse({ name: String(req.query.name ?? "") });
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Shop name is required",
    });
  }

  const excludeId = req.query.exclude_id
    ? parseId(String(req.query.exclude_id))
    : null;

  const slug = await uniqueVendorSlug(parsed.data.name, (s) =>
    slugTaken(s, excludeId ?? undefined),
  );
  return res.json({
    slug,
    base: slugify(parsed.data.name) || "shop",
  });
});

dashboardVendorsRouter.get("/", async (req, res) => {
  const parsed = shopListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Invalid query",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const seesAll = ["super_admin", "admin", "moderator"].includes(req.auth!.role);
  const { q, page, limit } = parsed.data;

  const storeIds = seesAll
    ? null
    : await actorStoreIds(req.auth!.userId, req.auth!.role);

  const where: Prisma.VendorWhereInput = {
    deleted_at: null,
    ...(storeIds === null
      ? {}
      : storeIds.length === 0
        ? { id: BigInt(0) }
        : { id: { in: storeIds } }),
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
  const storeIds = await actorStoreIds(req.auth!.userId, req.auth!.role);
  const shopId =
    storeIds === null
      ? null
      : storeIds[0] ??
        (
          await prisma.vendor.findFirst({
            where: { user_id: req.auth!.userId, deleted_at: null },
            select: { id: true },
          })
        )?.id ??
        null;

  const vendor = shopId
    ? await prisma.vendor.findFirst({
        where: { id: shopId, deleted_at: null },
        include: shopInclude,
      })
    : null;

  return res.json({
    shop: vendor ? toPublicShop(vendor) : null,
  });
});

dashboardVendorsRouter.get("/:idOrSlug/history", async (req, res) => {
  const vendor = await findVendorByIdOrSlug(String(req.params.idOrSlug), {
    includeDeleted: true,
  });
  if (!vendor) {
    return res.status(404).json({ message: "Store not found" });
  }
  if (
    !(await assertCanAccessShop(vendor, req.auth!.userId, req.auth!.role, "read"))
  ) {
    return res.status(403).json({ message: shopAccessDeniedMessage(req.auth!.role) });
  }

  const rows = await prisma.vendorHistory.findMany({
    where: { vendor_id: vendor.id },
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

dashboardVendorsRouter.delete("/:idOrSlug/history", async (req, res) => {
  const vendor = await findVendorByIdOrSlug(String(req.params.idOrSlug), {
    includeDeleted: true,
  });
  if (!vendor) {
    return res.status(404).json({ message: "Store not found" });
  }
  if (
    !(await assertCanAccessShop(vendor, req.auth!.userId, req.auth!.role))
  ) {
    return res.status(403).json({ message: shopAccessDeniedMessage(req.auth!.role) });
  }

  const result = await prisma.vendorHistory.deleteMany({
    where: { vendor_id: vendor.id },
  });

  return res.json({
    message: "Store history cleared",
    deleted: result.count,
  });
});

dashboardVendorsRouter.get("/:idOrSlug", async (req, res) => {
  const vendor = await findVendorWithMedia(String(req.params.idOrSlug));

  if (!vendor) return res.status(404).json({ message: "Store not found" });

  if (
    !(await assertCanAccessShop(vendor, req.auth!.userId, req.auth!.role, "read"))
  ) {
    return res.status(403).json({ message: shopAccessDeniedMessage(req.auth!.role) });
  }

  return res.json({ shop: toPublicShop(vendor) });
});

function canManageStoreTeam(role: string) {
  return role === "super_admin" || role === "admin" || role === "moderator";
}

/** List store team (owner + helpers). */
dashboardVendorsRouter.get("/:idOrSlug/members", async (req, res) => {
  const vendor = await findVendorWithMedia(String(req.params.idOrSlug));
  if (!vendor) return res.status(404).json({ message: "Store not found" });
  if (
    !(await assertCanAccessShop(vendor, req.auth!.userId, req.auth!.role, "read"))
  ) {
    return res.status(403).json({ message: shopAccessDeniedMessage(req.auth!.role) });
  }
  return res.json({
    members: toPublicShop(vendor).members,
    limits: { max_members: VENDOR_MEMBER_MAX, max_helpers: VENDOR_HELPER_MAX },
  });
});

/** Add a helper vendor (moderator / admin / super_admin). Max 2 helpers. */
dashboardVendorsRouter.post("/:idOrSlug/members", async (req, res) => {
  if (!canManageStoreTeam(req.auth!.role)) {
    return res.status(403).json({
      message: "Only super admin, admin, or moderator can assign store helpers",
    });
  }

  const parsed = addMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const vendor = await findVendorWithMedia(String(req.params.idOrSlug));
  if (!vendor) return res.status(404).json({ message: "Store not found" });

  const userId = BigInt(parsed.data.user_id);
  if (userId === vendor.user_id) {
    return res.status(400).json({ message: "That user is already the store owner" });
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, deleted_at: null },
  });
  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.role !== "vendor") {
    return res.status(400).json({
      message: "Only vendor-role accounts can be store helpers",
    });
  }

  const helperCount = await prisma.vendorMember.count({
    where: { vendor_id: vendor.id, role: "helper" },
  });
  if (helperCount >= VENDOR_HELPER_MAX) {
    return res.status(409).json({
      message: `A store can have at most ${VENDOR_HELPER_MAX} helpers`,
    });
  }

  const ownsShop = await prisma.vendor.findFirst({
    where: { user_id: userId, deleted_at: null },
  });
  if (ownsShop) {
    return res.status(409).json({
      message: "That user already owns a store and cannot be a helper elsewhere",
    });
  }

  const existingMember = await prisma.vendorMember.findFirst({
    where: { user_id: userId },
  });
  if (existingMember) {
    return res.status(409).json({
      message:
        existingMember.vendor_id === vendor.id
          ? "That user is already on this store team"
          : "That user is already on another store team",
    });
  }

  await prisma.vendorMember.create({
    data: { vendor_id: vendor.id, user_id: userId, role: "helper" },
  });

  await recordHistory({
    vendorId: vendor.id,
    actorId: req.auth!.userId,
    action: "member_added",
    changes: {
      helper_user_id: { from: null, to: userId.toString() },
    },
  });

  const refreshed = await findVendorWithMedia(String(req.params.idOrSlug));
  return res.status(201).json({
    message: "Helper added to store",
    shop: refreshed ? toPublicShop(refreshed) : toPublicShop(vendor),
  });
});

/** Remove a helper (not the owner). */
dashboardVendorsRouter.delete("/:idOrSlug/members/:userId", async (req, res) => {
  if (!canManageStoreTeam(req.auth!.role)) {
    return res.status(403).json({
      message: "Only super admin, admin, or moderator can remove store helpers",
    });
  }

  const vendor = await findVendorByIdOrSlug(String(req.params.idOrSlug));
  if (!vendor) return res.status(404).json({ message: "Store not found" });

  const memberUserId = parseId(String(req.params.userId));
  if (!memberUserId) {
    return res.status(400).json({ message: "Invalid member user id" });
  }

  const member = await prisma.vendorMember.findFirst({
    where: { vendor_id: vendor.id, user_id: memberUserId },
  });
  if (!member) {
    return res.status(404).json({ message: "Store member not found" });
  }
  if (member.role === "owner") {
    return res.status(400).json({
      message: "Cannot remove the store owner. Transfer ownership first.",
    });
  }

  await prisma.vendorMember.delete({ where: { id: member.id } });

  await recordHistory({
    vendorId: vendor.id,
    actorId: req.auth!.userId,
    action: "member_removed",
    changes: {
      helper_user_id: { from: memberUserId.toString(), to: null },
    },
  });

  const refreshed = await findVendorWithMedia(String(req.params.idOrSlug));
  return res.json({
    message: "Helper removed from store",
    shop: refreshed ? toPublicShop(refreshed) : undefined,
  });
});

dashboardVendorsRouter.post("/", async (req, res) => {
  if (req.auth!.role === "admin" || req.auth!.role === "moderator") {
    return res.status(403).json({
      message: "Only super admin or a vendor can create stores",
    });
  }

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

  /** Staff who may own a shop (super admin may assign any of these, including self). */
  const SHOP_OWNER_ROLES = [
    "super_admin",
    "admin",
    "moderator",
    "vendor",
  ] as const;

  if (isSuper) {
    if (!data.user_id) {
      return res.status(400).json({
        message: "Select an owner email for this shop",
      });
    }
    ownerId = BigInt(data.user_id);
    const owner = await prisma.user.findFirst({
      where: { id: ownerId, deleted_at: null },
    });
    if (!owner) {
      return res.status(404).json({ message: "Owner user not found" });
    }
    if (
      !(SHOP_OWNER_ROLES as readonly string[]).includes(owner.role)
    ) {
      return res.status(400).json({
        message:
          "Shop owner must be a staff member (super admin, admin, moderator, or vendor)",
      });
    }
  } else if (data.user_id) {
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

  const alreadyMember = await prisma.vendorMember.findFirst({
    where: { user_id: ownerId },
  });
  if (alreadyMember) {
    return res.status(409).json({
      message: "This user is already on another store team",
    });
  }

  const slug = data.slug
    ? (await slugTaken(data.slug)
        ? await uniqueVendorSlug(data.slug, (s) => slugTaken(s))
        : data.slug)
    : await uniqueVendorSlug(data.shop_name, (s) => slugTaken(s));

  // Create UI: draft → pending, publish → active (default draft).
  const status: UserStatus = data.status ?? "pending";

  const vendor = await prisma.vendor.create({
    data: {
      user_id: ownerId,
      shop_name: data.shop_name,
      slug,
      description: data.description ?? null,
      shop_name_bn: data.shop_name_bn ?? null,
      description_bn: data.description_bn ?? null,
      status,
      fee_plan: "commission",
      commission_percent: 3,
      members: {
        create: { user_id: ownerId, role: "owner" },
      },
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

dashboardVendorsRouter.patch("/:idOrSlug", async (req, res) => {
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

  const existing = await findVendorByIdOrSlug(String(req.params.idOrSlug));
  if (!existing) return res.status(404).json({ message: "Store not found" });
  const id = existing.id;

  const isSuper = req.auth!.role === "super_admin";
  if (
    !(await assertCanAccessShop(existing, req.auth!.userId, req.auth!.role))
  ) {
    return res.status(403).json({ message: shopAccessDeniedMessage(req.auth!.role) });
  }

  if (!isSuper && (data.status !== undefined || data.user_id !== undefined)) {
    return res.status(403).json({
      message: "Only super admin can change shop status or owner",
    });
  }

  const feeTouched =
    data.fee_plan !== undefined ||
    data.commission_percent !== undefined ||
    data.rent_amount !== undefined ||
    data.rent_period !== undefined;
  if (feeTouched && !isSuper) {
    return res.status(403).json({
      message: "Only super admin can change store fee plans",
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
      if (
        !["super_admin", "admin", "moderator", "vendor"].includes(owner.role)
      ) {
        return res.status(400).json({
          message:
            "Shop owner must be a staff member (super admin, admin, moderator, or vendor)",
        });
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
      const memberElsewhere = await prisma.vendorMember.findFirst({
        where: { user_id: nextUserId, NOT: { vendor_id: id } },
      });
      if (memberElsewhere) {
        return res.status(409).json({
          message: "That user is already on another store team",
        });
      }
    }
  }

  const nextFeePlan = data.fee_plan ?? existing.fee_plan;
  const nextCommission =
    data.commission_percent !== undefined
      ? data.commission_percent
      : existing.commission_percent !== null
        ? Number(existing.commission_percent)
        : null;
  const nextRentAmount =
    data.rent_amount !== undefined
      ? data.rent_amount
      : existing.rent_amount !== null
        ? Number(existing.rent_amount)
        : null;
  const nextRentPeriod =
    data.rent_period !== undefined ? data.rent_period : existing.rent_period;
  if (feeTouched) {
    if (
      (nextFeePlan === "commission" || nextFeePlan === "both") &&
      nextCommission === null
    ) {
      return res.status(400).json({
        message: "Commission percent is required for this fee plan",
      });
    }
    if (nextFeePlan === "rent" || nextFeePlan === "both") {
      if (nextRentAmount === null) {
        return res.status(400).json({ message: "Rent amount is required for this fee plan" });
      }
      if (!nextRentPeriod) {
        return res.status(400).json({ message: "Rent period is required for this fee plan" });
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
  if (
    data.shop_name_bn !== undefined &&
    data.shop_name_bn !== existing.shop_name_bn
  ) {
    changes.shop_name_bn = { from: existing.shop_name_bn, to: data.shop_name_bn };
  }
  if (
    data.description_bn !== undefined &&
    data.description_bn !== existing.description_bn
  ) {
    changes.description_bn = {
      from: existing.description_bn,
      to: data.description_bn,
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
  if (
    data.storefront_theme !== undefined &&
    data.storefront_theme !== existing.storefront_theme
  ) {
    changes.storefront_theme = {
      from: existing.storefront_theme,
      to: data.storefront_theme,
    };
  }
  if (
    data.products_per_page !== undefined &&
    data.products_per_page !== existing.products_per_page
  ) {
    changes.products_per_page = {
      from: existing.products_per_page,
      to: data.products_per_page,
    };
  }
  if (
    data.featured_products_count !== undefined &&
    data.featured_products_count !== existing.featured_products_count
  ) {
    changes.featured_products_count = {
      from: existing.featured_products_count,
      to: data.featured_products_count,
    };
  }
  if (
    data.show_banned_brands !== undefined &&
    data.show_banned_brands !== existing.show_banned_brands
  ) {
    changes.show_banned_brands = {
      from: existing.show_banned_brands,
      to: data.show_banned_brands,
    };
  }
  if (
    data.product_sort !== undefined &&
    data.product_sort !== existing.product_sort
  ) {
    changes.product_sort = {
      from: existing.product_sort,
      to: data.product_sort,
    };
  }
  if (isSuper && feeTouched) {
    if (data.fee_plan !== undefined && data.fee_plan !== existing.fee_plan) {
      changes.fee_plan = { from: existing.fee_plan, to: data.fee_plan };
    }
    if (data.commission_percent !== undefined) {
      changes.commission_percent = {
        from: existing.commission_percent?.toString() ?? null,
        to: data.commission_percent,
      };
    }
    if (data.rent_amount !== undefined) {
      changes.rent_amount = {
        from: existing.rent_amount?.toString() ?? null,
        to: data.rent_amount,
      };
    }
    if (data.rent_period !== undefined) {
      changes.rent_period = {
        from: existing.rent_period,
        to: data.rent_period,
      };
    }
  }

  const vendor = await prisma.vendor.update({
    where: { id },
    data: {
      shop_name: data.shop_name,
      slug: data.slug,
      description:
        data.description === undefined ? undefined : data.description,
      shop_name_bn: data.shop_name_bn,
      description_bn: data.description_bn,
      status: isSuper ? data.status : undefined,
      user_id: nextUserId,
      storefront_theme: data.storefront_theme,
      products_per_page: data.products_per_page,
      featured_products_count: data.featured_products_count,
      show_banned_brands: data.show_banned_brands,
      product_sort: data.product_sort,
      ...(isSuper && feeTouched
        ? {
            fee_plan: data.fee_plan,
            commission_percent:
              data.commission_percent === undefined
                ? undefined
                : data.commission_percent,
            rent_amount:
              data.rent_amount === undefined ? undefined : data.rent_amount,
            rent_period:
              data.rent_period === undefined ? undefined : data.rent_period,
          }
        : {}),
    },
    include: shopInclude,
  });

  if (
    nextUserId !== undefined &&
    nextUserId !== existing.user_id
  ) {
    await prisma.vendorMember.deleteMany({
      where: { vendor_id: id, role: "owner" },
    });
    await prisma.vendorMember.upsert({
      where: { user_id: nextUserId },
      create: { vendor_id: id, user_id: nextUserId, role: "owner" },
      update: { vendor_id: id, role: "owner" },
    });
  }

  if (Object.keys(changes).length > 0) {
    await recordHistory({
      vendorId: id,
      actorId: req.auth!.userId,
      action: "updated",
      changes,
    });
  }

  revalidateFrontend(storeTags(existing.slug, vendor.slug));

  return res.json({
    message: "Shop updated",
    shop: toPublicShop(vendor),
  });
});

/** Upload / replace shop logo (store image). */
dashboardVendorsRouter.post(
  "/:idOrSlug/logo",
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
    const existing = await findVendorWithMedia(String(req.params.idOrSlug));
    if (!existing) {
      discardUpload(req.file);
      return res.status(404).json({ message: "Store not found" });
    }
    const id = existing.id;

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        message: "Shop image is required (field: logo)",
      });
    }

    if (
      !(await assertCanAccessShop(existing, req.auth!.userId, req.auth!.role, "design"))
    ) {
      discardUpload(file);
      return res.status(403).json({ message: shopAccessDeniedMessage(req.auth!.role) });
    }

    const finalized = await finalizeShopImageUpload(uploadBytes(file), file.mimetype, "shopLogo");
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
          disk: currentMediaDisk(),
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
        await deleteMediaFile(existing.logo.file_path, existing.logo.file_name);
        await prisma.media
          .delete({ where: { id: existing.logo.id } })
          .catch(() => undefined);
      }

      revalidateFrontend(storeTags(vendor.slug));
      return res.json({
        message: "Shop image updated",
        shop: toPublicShop(vendor),
      });
    } catch (err) {
      await deleteMediaFile(SHOP_IMAGES_RELATIVE, finalized.fileName);
      throw err;
    }
  },
);

/** Upload / replace storefront banner. */
dashboardVendorsRouter.post(
  "/:idOrSlug/banner",
  (req, res, next) => {
    shopImageUpload.single("banner")(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          message: err instanceof Error ? err.message : "Upload failed",
        });
      }
      return next();
    });
  },
  async (req, res) => {
    const existing = await findVendorWithMedia(String(req.params.idOrSlug));
    if (!existing) {
      discardTempUpload(req.file);
      return res.status(404).json({ message: "Store not found" });
    }
    const id = existing.id;

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        message: "Banner image is required (field: banner)",
      });
    }

    if (
      !(await assertCanAccessShop(existing, req.auth!.userId, req.auth!.role, "design"))
    ) {
      discardTempUpload(file);
      return res.status(403).json({ message: shopAccessDeniedMessage(req.auth!.role) });
    }

    const finalized = await finalizeShopImageUpload(uploadBytes(file), file.mimetype, "shopBanner");
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
          disk: currentMediaDisk(),
          file_name: finalized.fileName,
          original_name: sanitizeOriginalName(file.originalname),
          file_path: SHOP_IMAGES_RELATIVE,
          file_size: BigInt(finalized.size),
          mime_type: finalized.detected.mime,
          alt_text: `${existing.shop_name} banner`.slice(0, 255),
          collection_name: "vendor_banners",
          is_public: true,
          mediable_type: "Vendor",
          mediable_id: id,
          sort_order: 1,
        },
      });

      const vendor = await prisma.vendor.update({
        where: { id },
        data: { banner_id: media.id },
        include: shopInclude,
      });

      await recordHistory({
        vendorId: id,
        actorId: req.auth!.userId,
        action: "banner_changed",
        changes: {
          banner_id: {
            from: existing.banner_id?.toString() ?? null,
            to: media.id.toString(),
          },
          banner_file: {
            from: existing.banner?.file_name ?? null,
            to: media.file_name,
          },
        },
      });

      if (existing.banner && existing.banner.id !== media.id) {
        await deleteMediaFile(existing.banner.file_path, existing.banner.file_name);
        await prisma.media
          .delete({ where: { id: existing.banner.id } })
          .catch(() => undefined);
      }

      revalidateFrontend(storeTags(vendor.slug));
      return res.json({
        message: "Store banner updated",
        shop: toPublicShop(vendor),
      });
    } catch (err) {
      await deleteMediaFile(SHOP_IMAGES_RELATIVE, finalized.fileName);
      throw err;
    }
  },
);

const showcaseVendorInclude = { og_image: true, logo: true, banner: true } as const;

async function loadShowcaseVendor(
  req: import("express").Request,
  res: import("express").Response,
) {
  const where = vendorWhere(String(req.params.idOrSlug));
  const vendor = where
    ? await prisma.vendor.findFirst({ where, include: showcaseVendorInclude })
    : null;
  if (!vendor) {
    res.status(404).json({ message: "Store not found" });
    return null;
  }
  if (!(await assertCanAccessShop(vendor, req.auth!.userId, req.auth!.role, "design"))) {
    res.status(403).json({
      message:
        req.auth!.role === "vendor"
          ? "This is not your store"
          : "You can only customize your own store page",
    });
    return null;
  }
  return vendor;
}

function showcasePayload(
  vendor: NonNullable<Awaited<ReturnType<typeof loadShowcaseVendor>>>,
  actorId: bigint,
) {
  return {
    id: vendor.id.toString(),
    slug: vendor.slug,
    shop_name: vendor.shop_name,
    owned_by_actor: vendor.user_id === actorId,
    logo: toPublicMedia(vendor.logo),
    banner: toPublicMedia(vendor.banner),
    ...toDashboardShowcase(vendor),
  };
}

/** Store page design: SEO, branding, layout, about/contact/social, policies, announcement. */
dashboardVendorsRouter.get("/:idOrSlug/showcase", async (req, res) => {
  const vendor = await loadShowcaseVendor(req, res);
  if (!vendor) return;
  return res.json({
    showcase: showcasePayload(vendor, req.auth!.userId),
  });
});

dashboardVendorsRouter.patch("/:idOrSlug/showcase", async (req, res) => {
  const parsed = updateShowcaseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  const existing = await loadShowcaseVendor(req, res);
  if (!existing) return;

  const { data, changes } = buildShowcaseUpdate(existing, parsed.data);
  const vendor = await prisma.vendor.update({
    where: { id: existing.id },
    data,
    include: showcaseVendorInclude,
  });

  if (Object.keys(changes).length > 0) {
    await recordHistory({
      vendorId: vendor.id,
      actorId: req.auth!.userId,
      action: "showcase_updated",
      changes,
      note:
        req.auth!.role === "admin" || (req.auth!.role === "super_admin" && existing.user_id !== req.auth!.userId)
          ? "Store page design changed by admin override"
          : null,
    });
  }

  revalidateFrontend(storeTags(vendor.slug));
  return res.json({
    message: "Store page saved",
    showcase: showcasePayload(vendor, req.auth!.userId),
  });
});

/** Share (Open Graph) image for the store page — field `image`, 1 MB, resized to 1200×630. */
dashboardVendorsRouter.post(
  "/:idOrSlug/og-image",
  singleImageUpload(categoryImageUpload, "image", "Share image", SHOWCASE_IMAGE_MAX_BYTES.og, "OG_IMAGE"),
  async (req, res) => {
    const existing = await loadShowcaseVendor(req, res);
    if (!existing) {
      discardUpload(req.file);
      return;
    }
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "Share image is required (field: image)" });
    }

    const stored = await storeShowcaseImage({
      file,
      kind: "og",
      actorId: req.auth!.userId,
      altText: existing.shop_name,
      mediableType: "Vendor",
      mediableId: existing.id,
    });
    if (!stored.ok) {
      return res.status(400).json({ message: stored.message, code: stored.code });
    }

    const vendor = await prisma.vendor.update({
      where: { id: existing.id },
      data: { og_image_id: stored.media.id },
      include: showcaseVendorInclude,
    });
    await recordHistory({
      vendorId: vendor.id,
      actorId: req.auth!.userId,
      action: "og_image_changed",
      changes: {
        og_image_id: {
          from: existing.og_image_id?.toString() ?? null,
          to: stored.media.id.toString(),
        },
      },
    });
    if (existing.og_image && existing.og_image.id !== stored.media.id) {
      await removeStoredMedia(existing.og_image);
    }

    revalidateFrontend(storeTags(vendor.slug));
    return res.json({
      message: "Share image updated",
      showcase: showcasePayload(vendor, req.auth!.userId),
    });
  },
);

dashboardVendorsRouter.delete("/:idOrSlug/og-image", async (req, res) => {
  const existing = await loadShowcaseVendor(req, res);
  if (!existing) return;
  if (!existing.og_image) {
    return res.status(404).json({ message: "This store has no share image" });
  }

  const vendor = await prisma.vendor.update({
    where: { id: existing.id },
    data: { og_image_id: null },
    include: showcaseVendorInclude,
  });
  await removeStoredMedia(existing.og_image);
  await recordHistory({
    vendorId: vendor.id,
    actorId: req.auth!.userId,
    action: "og_image_removed",
    changes: { og_image_id: { from: existing.og_image.id.toString(), to: null } },
  });

  revalidateFrontend(storeTags(vendor.slug));
  return res.json({
    message: "Share image removed",
    showcase: showcasePayload(vendor, req.auth!.userId),
  });
});

/** Soft-delete shop — super admin only. */
dashboardVendorsRouter.delete("/:idOrSlug", async (req, res) => {
  if (req.auth!.role !== "super_admin") {
    return res.status(403).json({ message: "Only super admin can delete shops" });
  }

  const existing = await findVendorByIdOrSlug(String(req.params.idOrSlug));
  if (!existing) return res.status(404).json({ message: "Store not found" });
  const id = existing.id;

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
    note: "Store soft-deleted by super admin",
  });

  revalidateFrontend(storeTags(existing.slug));

  return res.json({
    message: "Store deleted",
    shop: toPublicShop(vendor),
  });
});
