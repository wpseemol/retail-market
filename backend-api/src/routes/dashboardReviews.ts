import { Router, type Request, type Response } from "express";
import type { Prisma, ProductReviewStatus, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  dashboardReviewInclude,
  loadReviewMedia,
  removeReviewMediaFiles,
  reviewImageIds,
  toDashboardReview,
  type DashboardReviewRow,
} from "../lib/productReviews.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  flagReviewSchema,
  listReviewsQuerySchema,
  PRODUCT_REVIEW_STATUSES,
  updateReviewStatusSchema,
  vendorReplySchema,
} from "../validators/productReview.js";

export const dashboardReviewsRouter = Router();

dashboardReviewsRouter.use(requireAuth, requireRoles("super_admin", "admin", "moderator", "vendor"));

const requireModerator = requireRoles("super_admin", "admin", "moderator");
const requireReplier = requireRoles("super_admin", "admin", "vendor");
const requireDeleter = requireRoles("super_admin", "admin");

/** Which target statuses each role may set. Admins have full control. */
const ALLOWED_TARGETS: Record<string, readonly ProductReviewStatus[]> = {
  super_admin: PRODUCT_REVIEW_STATUSES,
  admin: PRODUCT_REVIEW_STATUSES,
  moderator: ["approved", "hidden"],
  vendor: ["approved", "hidden"],
};

function validationError(res: Response, error: { flatten: () => { fieldErrors: unknown } }, message = "Validation failed") {
  return res.status(400).json({ message, errors: error.flatten().fieldErrors });
}

function parseReviewId(req: Request) {
  const raw = String(req.params.id ?? "");
  return /^\d{1,19}$/.test(raw) ? BigInt(raw) : null;
}

/** `undefined` = staff (no scope); `null` = vendor without a shop. */
async function vendorScope(req: Request): Promise<bigint | null | undefined> {
  if (req.auth!.role !== "vendor") return undefined;
  const shop = await prisma.vendor.findFirst({
    where: { user_id: req.auth!.userId, deleted_at: null },
    select: { id: true },
  });
  return shop?.id ?? null;
}

type Loaded = { ok: true; review: DashboardReviewRow } | { ok: false; status: number; message: string };

async function loadReview(req: Request): Promise<Loaded> {
  const id = parseReviewId(req);
  if (!id) return { ok: false, status: 400, message: "Invalid review id" };

  const review = await prisma.productReview.findFirst({
    where: { id, deleted_at: null },
    include: dashboardReviewInclude,
  });
  if (!review) return { ok: false, status: 404, message: "Review not found" };

  const scope = await vendorScope(req);
  if (scope !== undefined && (scope === null || review.product.vendor_id !== scope)) {
    return { ok: false, status: 404, message: "Review not found" };
  }
  return { ok: true, review };
}

async function respondWithReview(req: Request, res: Response, id: bigint, message: string) {
  const review = await prisma.productReview.findUniqueOrThrow({ where: { id }, include: dashboardReviewInclude });
  const media = await loadReviewMedia([review]);
  return res.json({ message, review: toDashboardReview(review, media, req.auth!.role) });
}

/** Why a role can't move this review to `next`, or null when allowed. */
function statusBlockReason(role: UserRole, review: DashboardReviewRow, next: ProductReviewStatus): string | null {
  if (!(ALLOWED_TARGETS[role] ?? []).includes(next)) {
    return role === "moderator"
      ? "Moderators can approve or hide reviews. Ask an admin to reject one."
      : "You can only hide or show reviews.";
  }
  if (role === "vendor") {
    if (review.status !== "approved" && review.status !== "hidden") {
      return "Pending or rejected reviews are handled by the marketplace team.";
    }
    const hiddenByStaff = review.status === "hidden" && review.moderator && review.moderator.role !== "vendor";
    if (hiddenByStaff && next === "approved") {
      return "This review was hidden by the marketplace team, so only they can show it again.";
    }
  }
  return null;
}

dashboardReviewsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = listReviewsQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error, "Invalid query");

    const { status, flagged, rating, product_id, q, page, limit } = parsed.data;
    const scope = await vendorScope(req);
    const emptyCounts = { all: 0, pending: 0, approved: 0, hidden: 0, rejected: 0 };
    if (scope === null) {
      return res.json({ reviews: [], counts: emptyCounts, pagination: { page, limit, total: 0, pages: 0 } });
    }

    const base: Prisma.ProductReviewWhereInput = { deleted_at: null };
    const and: Prisma.ProductReviewWhereInput[] = [];
    if (scope !== undefined) and.push({ product: { vendor_id: scope } });
    if (product_id) and.push({ product_id: BigInt(product_id) });
    if (rating) and.push({ rating });
    if (flagged) and.push({ flagged_at: flagged === "true" ? { not: null } : null });
    if (q) {
      and.push({
        OR: [
          { author_name: { contains: q } },
          { author_email: { contains: q.toLowerCase() } },
          { author_phone: { contains: q } },
          { title: { contains: q } },
          { comment: { contains: q } },
          { product: { name: { contains: q } } },
        ],
      });
    }
    const scoped: Prisma.ProductReviewWhereInput = { ...base, AND: and };
    const where: Prisma.ProductReviewWhereInput = status === "all" ? scoped : { ...scoped, status };

    const [total, rows, grouped] = await Promise.all([
      prisma.productReview.count({ where }),
      prisma.productReview.findMany({
        where,
        include: dashboardReviewInclude,
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.productReview.groupBy({ by: ["status"], where: scoped, _count: { _all: true } }),
    ]);

    const counts = { ...emptyCounts };
    for (const group of grouped) {
      counts[group.status] = group._count._all;
      counts.all += group._count._all;
    }
    const media = await loadReviewMedia(rows);

    return res.json({
      reviews: rows.map((row) => toDashboardReview(row, media, req.auth!.role)),
      counts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

dashboardReviewsRouter.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const parsed = updateReviewStatusSchema.safeParse(req.body ?? {});
    if (!parsed.success) return validationError(res, parsed.error);

    const loaded = await loadReview(req);
    if (!loaded.ok) return res.status(loaded.status).json({ message: loaded.message });
    const { review } = loaded;
    const next = parsed.data.status;

    if (review.status === next) {
      return res.status(409).json({ message: `Review is already ${next}.`, code: "STATUS_UNCHANGED" });
    }
    const blocked = statusBlockReason(req.auth!.role, review, next);
    if (blocked) return res.status(403).json({ message: blocked, code: "REVIEW_STATUS_FORBIDDEN" });

    const updated = await prisma.productReview.updateMany({
      where: { id: review.id, status: review.status, deleted_at: null },
      data: { status: next, moderated_by: req.auth!.userId, moderated_at: new Date() },
    });
    if (updated.count === 0) {
      return res.status(409).json({
        message: "This review was changed by someone else. Refresh and try again.",
        code: "REVIEW_CHANGED",
      });
    }
    return respondWithReview(req, res, review.id, `Review ${next === "approved" ? "approved" : `marked ${next}`}`);
  }),
);

dashboardReviewsRouter.patch(
  "/:id/flag",
  requireModerator,
  asyncHandler(async (req, res) => {
    const parsed = flagReviewSchema.safeParse(req.body ?? {});
    if (!parsed.success) return validationError(res, parsed.error);

    const loaded = await loadReview(req);
    if (!loaded.ok) return res.status(loaded.status).json({ message: loaded.message });

    const { flagged, reason } = parsed.data;
    await prisma.productReview.update({
      where: { id: loaded.review.id },
      data: flagged
        ? { flagged_at: new Date(), flag_reason: reason ?? null }
        : { flagged_at: null, flag_reason: null },
    });
    return respondWithReview(req, res, loaded.review.id, flagged ? "Review flagged for an admin" : "Flag cleared");
  }),
);

dashboardReviewsRouter.patch(
  "/:id/reply",
  requireReplier,
  asyncHandler(async (req, res) => {
    const parsed = vendorReplySchema.safeParse(req.body ?? {});
    if (!parsed.success) return validationError(res, parsed.error);

    const loaded = await loadReview(req);
    if (!loaded.ok) return res.status(loaded.status).json({ message: loaded.message });

    const reply = parsed.data.reply;
    await prisma.productReview.update({
      where: { id: loaded.review.id },
      data: reply ? { vendor_reply: reply, vendor_replied_at: new Date() } : { vendor_reply: null, vendor_replied_at: null },
    });
    return respondWithReview(req, res, loaded.review.id, reply ? "Reply published" : "Reply removed");
  }),
);

dashboardReviewsRouter.delete(
  "/:id",
  requireDeleter,
  asyncHandler(async (req, res) => {
    const loaded = await loadReview(req);
    if (!loaded.ok) return res.status(loaded.status).json({ message: loaded.message });
    const { review } = loaded;

    const imageIds = reviewImageIds(review);
    const media = imageIds.length
      ? await prisma.media.findMany({ where: { id: { in: imageIds }, collection_name: "review_images" } })
      : [];

    await prisma.$transaction([
      prisma.media.deleteMany({ where: { id: { in: media.map((row) => row.id) } } }),
      prisma.productReview.delete({ where: { id: review.id } }),
    ]);

    removeReviewMediaFiles(media);
    return res.json({ message: "Review permanently deleted", id: review.id.toString() });
  }),
);
