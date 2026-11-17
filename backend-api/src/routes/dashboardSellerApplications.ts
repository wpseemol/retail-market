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
  DASHBOARD_DOC_FILE_BASE,
  hasRequiredIdentityDocs,
  STAFF_DOC_CHECKLIST,
  toPublicApplication,
} from "../lib/sellerApplication.js";
import { sendSellerKycFile } from "../lib/sellerKycServe.js";
import {
  listSellerApplicationsQuerySchema,
  reviewSellerApplicationSchema,
} from "../validators/sellerApplication.js";
import { revalidateFrontend } from "../lib/revalidate.js";
import { rateLimit } from "../lib/rateLimit.js";

/** Mounted at `/api/dashboard/seller-applications` — admin + super_admin only. */
export const dashboardSellerApplicationsRouter = Router();

dashboardSellerApplicationsRouter.use(
  requireAuth,
  requireRoles("super_admin", "admin"),
);

const reviewLimiter = rateLimit({
  name: "SELLER_APP_REVIEW",
  max: 60,
  windowMs: 60 * 60 * 1000,
  message: "Too many review actions. Try again later.",
  key: (req) => String(req.auth?.userId ?? "anon"),
});

function serialize(app: Parameters<typeof toPublicApplication>[0]) {
  return toPublicApplication(app, { documentFileBase: DASHBOARD_DOC_FILE_BASE });
}

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
      applications: rows.map(serialize),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
      staff_checklist: STAFF_DOC_CHECKLIST,
    });
  }),
);

/** Staff-only KYC file download. Must be registered before `/:id`. */
dashboardSellerApplicationsRouter.get(
  "/documents/:docId/file",
  asyncHandler(async (req, res) => {
    const docId = parseBigIntId(req.params.docId);
    if (docId === null) {
      return res.status(400).json({ message: "Invalid document id" });
    }
    const doc = await prisma.sellerApplicationDocument.findFirst({
      where: { id: docId },
      include: { media: true },
    });
    if (!doc?.media) {
      return res.status(404).json({ message: "Document not found" });
    }
    return sendSellerKycFile(res, doc.media);
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
      application: serialize(row),
      staff_checklist: STAFF_DOC_CHECKLIST,
    });
  }),
);

dashboardSellerApplicationsRouter.post(
  "/:id/review",
  reviewLimiter,
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
      const locked = await prisma.sellerApplication.updateMany({
        where: { id, status: { in: ["submitted", "under_review"] } },
        data: {
          status: "rejected",
          rejection_reason: parsed.data.rejection_reason ?? null,
          reviewed_by_id: actorId,
          reviewed_at: new Date(),
        },
      });
      if (locked.count === 0) {
        return res.status(409).json({
          message: "Application was already reviewed",
          code: "ALREADY_REVIEWED",
        });
      }
      const updated = await prisma.sellerApplication.findUniqueOrThrow({
        where: { id },
        include: applicationInclude,
      });
      return res.json({
        message: "Application rejected",
        application: serialize(updated),
      });
    }

    // Approve
    if (!app.shop_name?.trim()) {
      return res.status(400).json({ message: "Application is missing a shop name" });
    }
    if (!app.user) {
      return res.status(400).json({ message: "Applicant user missing" });
    }
    if (app.user.role !== "customer" && app.user.role !== "vendor") {
      return res.status(409).json({
        message: "Applicant account role cannot become a store owner",
        code: "ROLE_NOT_ELIGIBLE",
      });
    }

    const docTypes = app.documents.map((d) => d.doc_type);
    if (!hasRequiredIdentityDocs(docTypes)) {
      return res.status(400).json({
        message: "Application is missing required identity documents",
        code: "DOCUMENTS_INCOMPLETE",
      });
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

    try {
      const result = await prisma.$transaction(async (tx) => {
        const claim = await tx.sellerApplication.updateMany({
          where: { id, status: { in: ["submitted", "under_review"] } },
          data: {
            status: "under_review",
            reviewed_by_id: actorId,
            reviewed_at: new Date(),
          },
        });
        if (claim.count === 0) {
          throw new Error("ALREADY_REVIEWED");
        }

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
        application: serialize(result.updated),
        shop: {
          id: result.vendor.id.toString(),
          slug: result.vendor.slug,
          status: result.vendor.status,
          fee_plan: result.vendor.fee_plan,
          commission_percent: result.vendor.commission_percent?.toString() ?? null,
        },
      });
    } catch (err) {
      if (err instanceof Error && err.message === "ALREADY_REVIEWED") {
        return res.status(409).json({
          message: "Application was already reviewed",
          code: "ALREADY_REVIEWED",
        });
      }
      throw err;
    }
  }),
);
