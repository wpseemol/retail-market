import { Router } from "express";
import type { Prisma, UserStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parseBigIntId } from "../utils/ids.js";
import { uniqueVendorSlug } from "../lib/slug.js";
import { normalizeSearchTags } from "../lib/storeSearchTags.js";
import {
  applicationInclude,
  STAFF_DOC_CHECKLIST,
  toPublicApplication,
} from "../lib/sellerApplication.js";
import {
  listSellerApplicationsQuerySchema,
  reviewSellerApplicationSchema,
} from "../validators/sellerApplication.js";
import { revalidateFrontend } from "../lib/revalidate.js";

/** Mounted at `/api/dashboard/seller-applications` — admin + super_admin only. */
export const dashboardSellerApplicationsRouter = Router();

dashboardSellerApplicationsRouter.use(
  requireAuth,
  requireRoles("super_admin", "admin"),
);

async function slugTaken(slug: string) {
  const row = await prisma.vendor.findFirst({
    where: { slug, deleted_at: null },
    select: { id: true },
  });
  return Boolean(row);
}

dashboardSellerApplicationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = listSellerApplicationsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { status, page, limit, q } = parsed.data;
    const where: Prisma.SellerApplicationWhereInput = {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { shop_name: { contains: q } },
              { user: { email: { contains: q } } },
              { user: { phone: { contains: q } } },
              { user: { first_name: { contains: q } } },
              { user: { last_name: { contains: q } } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.sellerApplication.count({ where }),
      prisma.sellerApplication.findMany({
        where,
        include: applicationInclude,
        orderBy: [{ status: "asc" }, { created_at: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return res.json({
      applications: rows.map(toPublicApplication),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
      staff_checklist: STAFF_DOC_CHECKLIST,
    });
  }),
);

dashboardSellerApplicationsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parseBigIntId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "Invalid application id" });
    }
    const row = await prisma.sellerApplication.findUnique({
      where: { id },
      include: applicationInclude,
    });
    if (!row) return res.status(404).json({ message: "Application not found" });
    return res.json({
      application: toPublicApplication(row),
      staff_checklist: STAFF_DOC_CHECKLIST,
    });
  }),
);

dashboardSellerApplicationsRouter.post(
  "/:id/review",
  asyncHandler(async (req, res) => {
    const id = parseBigIntId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "Invalid application id" });
    }

    const parsed = reviewSellerApplicationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const app = await prisma.sellerApplication.findUnique({
      where: { id },
      include: applicationInclude,
    });
    if (!app) return res.status(404).json({ message: "Application not found" });
    if (app.status !== "submitted" && app.status !== "under_review") {
      return res.status(409).json({
        message: `Cannot review an application in status “${app.status}”`,
        code: "INVALID_STATUS",
      });
    }

    const actorId = req.auth!.userId;

    if (parsed.data.action === "reject") {
      const updated = await prisma.sellerApplication.update({
        where: { id },
        data: {
          status: "rejected",
          rejection_reason: parsed.data.rejection_reason ?? null,
          reviewed_by_id: actorId,
          reviewed_at: new Date(),
        },
        include: applicationInclude,
      });
      return res.json({
        message: "Application rejected",
        application: toPublicApplication(updated),
      });
    }

    // Approve
    if (!app.shop_name?.trim()) {
      return res.status(400).json({ message: "Application is missing a shop name" });
    }
    if (!app.user) {
      return res.status(400).json({ message: "Applicant user missing" });
    }

    const existingShop = await prisma.vendor.findFirst({
      where: { user_id: app.user_id, deleted_at: null },
    });
    if (existingShop) {
      return res.status(409).json({
        message: "Applicant already has a store",
        code: "ALREADY_SELLER",
      });
    }

    const alreadyMember = await prisma.vendorMember.findFirst({
      where: { user_id: app.user_id },
    });
    if (alreadyMember) {
      return res.status(409).json({
        message: "Applicant is already on another store team",
        code: "ALREADY_MEMBER",
      });
    }

    const status: UserStatus = parsed.data.activate_shop ? "active" : "pending";
    const slug = await uniqueVendorSlug(app.shop_name, (s) => slugTaken(s));

    const result = await prisma.$transaction(async (tx) => {
      if (app.user!.role === "customer") {
        await tx.user.update({
          where: { id: app.user_id },
          data: { role: "vendor" },
        });
      }

      const vendor = await tx.vendor.create({
        data: {
          user_id: app.user_id,
          shop_name: app.shop_name!,
          slug,
          shop_name_bn: app.shop_name_bn,
          description: app.description,
          search_tags: normalizeSearchTags(null),
          status,
          fee_plan: "commission",
          commission_percent: 3,
          members: {
            create: { user_id: app.user_id, role: "owner" },
          },
        },
      });

      const updated = await tx.sellerApplication.update({
        where: { id },
        data: {
          status: "approved",
          vendor_id: vendor.id,
          reviewed_by_id: actorId,
          reviewed_at: new Date(),
          rejection_reason: null,
        },
        include: applicationInclude,
      });

      return { vendor, updated };
    });

    await revalidateFrontend(["stores", `store:${result.vendor.slug}`]);

    return res.json({
      message: parsed.data.activate_shop
        ? "Application approved — store is active"
        : "Application approved — store is pending activation",
      application: toPublicApplication(result.updated),
      shop: {
        id: result.vendor.id.toString(),
        slug: result.vendor.slug,
        status: result.vendor.status,
        fee_plan: result.vendor.fee_plan,
        commission_percent: result.vendor.commission_percent?.toString() ?? null,
      },
    });
  }),
);
