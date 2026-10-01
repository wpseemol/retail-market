import fs from "node:fs";
import { Router, type NextFunction, type Request, type Response } from "express";
import { Prisma, type ProductReviewStatus } from "@prisma/client";
import { z } from "zod";
import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { rateLimit } from "../lib/rateLimit.js";
import { finalizeReviewImageUpload, REVIEW_IMAGE_MAX_FILES, REVIEW_IMAGES_RELATIVE } from "../lib/reviewImage.js";
import { sanitizeOriginalName } from "../lib/avatarImage.js";
import {
  findEligibleOrder,
  findOwnReview,
  loadReviewMedia,
  publicAuthorName,
  removeReviewMediaFiles,
  REVIEW_ALREADY_SUBMITTED_MESSAGE,
  REVIEW_NOT_PURCHASED_MESSAGE,
  reviewImageIds,
  reviewSummary,
  toOwnReview,
  toPublicReview,
} from "../lib/productReviews.js";
import { optionalAuth } from "../middleware/auth.js";
import { reviewImageUpload } from "../middleware/upload.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { withSafeInput } from "../validators/customerAuth.js";
import {
  CONTACT_REQUIRED_MESSAGE,
  createReviewSchema,
  publicReviewsQuerySchema,
  reviewContactSchema,
  reviewIdParamSchema,
  updateOwnReviewSchema,
  type ReviewContact,
} from "../validators/productReview.js";
import { activeProductScope } from "./publicProducts.js";

/** Mounted at `/api/products/:idOrSlug/reviews`. */
export const productReviewsRouter = Router({ mergeParams: true });

const idOrSlugSchema = withSafeInput(
  z
    .string()
    .trim()
    .min(1)
    .max(270)
    .regex(/^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/, "Invalid product id or slug"),
);

/** Eligibility answers "did this contact buy X?", so it is throttled hard. */
const eligibilityLimiter = rateLimit({
  name: "REVIEW_ELIGIBILITY",
  max: 10,
  windowMs: 10 * 60 * 1000,
  message: "Too many verification attempts. Please try again in a few minutes.",
});

const submitLimiter = rateLimit({
  name: "REVIEW_SUBMIT",
  max: 5,
  windowMs: 60 * 60 * 1000,
  message: "Too many reviews submitted. Please try again later.",
});

const manageLimiter = rateLimit({
  name: "REVIEW_MANAGE",
  max: 20,
  windowMs: 60 * 60 * 1000,
  message: "Too many review changes. Please try again later.",
});

const NOT_OWNER_MESSAGE = "We couldn't find your review with that email or phone number.";

type StoredPhoto = { fileName: string; absolutePath: string; size: number; mime: string; originalName: string | null };

async function resolveProduct(req: Request) {
  const parsed = idOrSlugSchema.safeParse((req.params as { idOrSlug?: string }).idOrSlug);
  if (!parsed.success) return null;
  const key = parsed.data;
  return prisma.product.findFirst({
    where: { AND: [/^\d{1,19}$/.test(key) ? { id: BigInt(key) } : { slug: key }, activeProductScope()] },
    select: { id: true, name: true },
  });
}

function removeFiles(paths: string[]) {
  for (const file of paths) {
    try {
      fs.unlinkSync(file);
    } catch {
      /* ignore */
    }
  }
}

function uploadedFiles(req: Request): Express.Multer.File[] {
  return Array.isArray(req.files) ? req.files : [];
}

function validationError(res: Response, error: { flatten: () => { fieldErrors: unknown } }, message = "Validation failed") {
  return res.status(400).json({ message, errors: error.flatten().fieldErrors });
}

/** Guests prove who they are with the checkout email/phone; signed-in customers can skip it. */
function hasIdentity(req: Request, contact: ReviewContact) {
  return Boolean(contact.email || contact.phone || req.auth?.userId);
}

function contactRequired(res: Response) {
  return res.status(400).json({
    message: CONTACT_REQUIRED_MESSAGE,
    errors: { email: [CONTACT_REQUIRED_MESSAGE] },
  });
}

function acceptPhotos(req: Request, res: Response, next: NextFunction) {
  reviewImageUpload.array("images", REVIEW_IMAGE_MAX_FILES)(req, res, (err) => {
    if (err) {
      removeFiles(uploadedFiles(req).map((file) => file.path));
      const message =
        err?.code === "LIMIT_FILE_SIZE"
          ? "Each review photo must be 2 MB or smaller"
          : err?.code === "LIMIT_FILE_COUNT" || err?.code === "LIMIT_UNEXPECTED_FILE"
            ? `You can attach up to ${REVIEW_IMAGE_MAX_FILES} photos (field: images)`
            : err instanceof Error
              ? err.message
              : "Upload failed";
      return res.status(400).json({ message, code: "REVIEW_UPLOAD_INVALID" });
    }
    return next();
  });
}

/** Sniff + resize every upload. On failure, every temp and finalized file is removed. */
async function finalizePhotos(
  files: Express.Multer.File[],
): Promise<{ ok: true; stored: StoredPhoto[] } | { ok: false; message: string; code: string }> {
  const tempPaths = files.map((file) => file.path);
  const stored: StoredPhoto[] = [];
  for (const [index, file] of files.entries()) {
    const finalized = await finalizeReviewImageUpload(file.path, file.mimetype);
    if (!finalized.ok) {
      removeFiles([...tempPaths.slice(index + 1), ...stored.map((item) => item.absolutePath)]);
      return { ok: false, message: finalized.message, code: finalized.code };
    }
    stored.push({
      fileName: finalized.fileName,
      absolutePath: finalized.absolutePath,
      size: finalized.size,
      mime: finalized.detected.mime,
      originalName: sanitizeOriginalName(file.originalname),
    });
  }
  return { ok: true, stored };
}

async function createPhotoRows(
  tx: Prisma.TransactionClient,
  stored: StoredPhoto[],
  reviewId: bigint,
  userId: bigint | null,
  productName: string,
  startIndex = 0,
) {
  const ids: string[] = [];
  for (const [index, item] of stored.entries()) {
    const media = await tx.media.create({
      data: {
        user_id: userId,
        file_name: item.fileName,
        original_name: item.originalName,
        file_path: REVIEW_IMAGES_RELATIVE,
        file_size: BigInt(item.size),
        mime_type: item.mime,
        alt_text: `Customer photo of ${productName}`.slice(0, 255),
        collection_name: "review_images",
        mediable_type: "ProductReview",
        mediable_id: reviewId,
        sort_order: startIndex + index,
      },
    });
    ids.push(media.id.toString());
  }
  return ids;
}

/** Loads the caller's own review on this product and checks it is the one in the URL. */
async function loadOwnReview(req: Request, contact: ReviewContact) {
  const id = reviewIdParamSchema.safeParse((req.params as { reviewId?: string }).reviewId);
  if (!id.success) return { ok: false as const, status: 404, message: "Review not found" };
  const product = await resolveProduct(req);
  if (!product) return { ok: false as const, status: 404, message: "Product not found" };
  const review = await findOwnReview(product.id, contact, req.auth?.userId);
  if (!review || review.id !== BigInt(id.data)) {
    return { ok: false as const, status: 403, message: NOT_OWNER_MESSAGE, code: "REVIEW_NOT_OWNER" };
  }
  return { ok: true as const, product, review };
}

productReviewsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = publicReviewsQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error, "Invalid query");

    const product = await resolveProduct(req);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const { page, limit, sort } = parsed.data;
    const where: Prisma.ProductReviewWhereInput = { product_id: product.id, status: "approved", deleted_at: null };
    const orderBy: Prisma.ProductReviewOrderByWithRelationInput[] =
      sort === "highest"
        ? [{ rating: "desc" }, { created_at: "desc" }]
        : sort === "lowest"
          ? [{ rating: "asc" }, { created_at: "desc" }]
          : [{ created_at: "desc" }];

    const [summary, rows] = await Promise.all([
      reviewSummary(product.id),
      prisma.productReview.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
    ]);
    const media = await loadReviewMedia(rows);

    return res.json({
      summary,
      reviews: rows.map((row) => toPublicReview(row, media)),
      pagination: {
        page,
        limit,
        total: summary.count,
        total_pages: Math.max(1, Math.ceil(summary.count / limit)),
      },
    });
  }),
);

productReviewsRouter.post(
  "/check-eligibility",
  eligibilityLimiter,
  optionalAuth,
  asyncHandler(async (req, res) => {
    const parsed = reviewContactSchema.safeParse(req.body ?? {});
    if (!parsed.success) return validationError(res, parsed.error);
    if (!hasIdentity(req, parsed.data)) return contactRequired(res);

    const product = await resolveProduct(req);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const result = await findEligibleOrder(product.id, parsed.data, req.auth?.userId);
    if (!result.ok) {
      if (result.reason === "already_reviewed") {
        const review = await findOwnReview(product.id, parsed.data, req.auth?.userId);
        const media = review ? await loadReviewMedia([review]) : new Map();
        return res.json({
          canReview: false,
          reason: result.reason,
          message: REVIEW_ALREADY_SUBMITTED_MESSAGE,
          review: review ? toOwnReview(review, media) : null,
        });
      }
      return res.json({ canReview: false, reason: result.reason, message: REVIEW_NOT_PURCHASED_MESSAGE });
    }
    return res.json({
      canReview: true,
      orderId: result.order.id.toString(),
      authorName: publicAuthorName(result.order.author_name),
    });
  }),
);

productReviewsRouter.post(
  "/",
  submitLimiter,
  optionalAuth,
  acceptPhotos,
  asyncHandler(async (req, res) => {
    const files = uploadedFiles(req);
    const tempPaths = files.map((file) => file.path);

    const parsed = createReviewSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      removeFiles(tempPaths);
      return validationError(res, parsed.error);
    }
    if (!hasIdentity(req, parsed.data)) {
      removeFiles(tempPaths);
      return contactRequired(res);
    }

    const product = await resolveProduct(req);
    if (!product) {
      removeFiles(tempPaths);
      return res.status(404).json({ message: "Product not found" });
    }

    const { email, phone, author_name, rating, title, comment } = parsed.data;
    const eligibility = await findEligibleOrder(product.id, { email, phone }, req.auth?.userId);
    if (!eligibility.ok) {
      removeFiles(tempPaths);
      return eligibility.reason === "already_reviewed"
        ? res.status(409).json({ message: REVIEW_ALREADY_SUBMITTED_MESSAGE, code: "REVIEW_ALREADY_SUBMITTED" })
        : res.status(403).json({ message: REVIEW_NOT_PURCHASED_MESSAGE, code: "REVIEW_NOT_ELIGIBLE" });
    }

    const photos = await finalizePhotos(files);
    if (!photos.ok) return res.status(400).json({ message: photos.message, code: photos.code });
    const { stored } = photos;

    const { order } = eligibility;
    try {
      const review = await prisma.$transaction(async (tx) => {
        const created = await tx.productReview.create({
          data: {
            product_id: product.id,
            user_id: order.user_id,
            order_id: order.id,
            author_name: author_name ?? order.author_name,
            author_email: order.customer_email ?? email ?? null,
            author_phone: order.customer_phone ?? phone ?? null,
            rating,
            title: title ?? null,
            comment,
            status: env.reviewsRequireApproval ? "pending" : "approved",
          },
        });
        if (stored.length === 0) return created;
        const mediaIds = await createPhotoRows(tx, stored, created.id, order.user_id, product.name);
        return tx.productReview.update({ where: { id: created.id }, data: { images: mediaIds } });
      });

      const media = await loadReviewMedia([review]);
      const pending = review.status === "pending";
      return res.status(201).json({
        message: pending
          ? "Thanks! Your review will appear once our team has checked it."
          : "Thanks! Your review is now live.",
        status: review.status,
        review: toPublicReview(review, media),
      });
    } catch (error) {
      removeFiles(stored.map((item) => item.absolutePath));
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return res.status(409).json({ message: REVIEW_ALREADY_SUBMITTED_MESSAGE, code: "REVIEW_ALREADY_SUBMITTED" });
      }
      throw error;
    }
  }),
);

/** The author edits their own review. Staff decisions (hidden / rejected) are kept. */
productReviewsRouter.patch(
  "/:reviewId",
  manageLimiter,
  optionalAuth,
  acceptPhotos,
  asyncHandler(async (req, res) => {
    const files = uploadedFiles(req);
    const tempPaths = files.map((file) => file.path);

    const parsed = updateOwnReviewSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      removeFiles(tempPaths);
      return validationError(res, parsed.error);
    }
    if (!hasIdentity(req, parsed.data)) {
      removeFiles(tempPaths);
      return contactRequired(res);
    }

    const { email, phone, author_name, rating, title, comment, keep_images } = parsed.data;
    const loaded = await loadOwnReview(req, { email, phone });
    if (!loaded.ok) {
      removeFiles(tempPaths);
      return res.status(loaded.status).json({ message: loaded.message, code: loaded.code });
    }
    const { product, review } = loaded;

    const currentIds = reviewImageIds(review).map(String);
    const keepIds = currentIds.filter((id) => keep_images.includes(id));
    if (keepIds.length + files.length > REVIEW_IMAGE_MAX_FILES) {
      removeFiles(tempPaths);
      return res.status(400).json({
        message: `You can attach up to ${REVIEW_IMAGE_MAX_FILES} photos`,
        code: "REVIEW_UPLOAD_INVALID",
      });
    }

    const photos = await finalizePhotos(files);
    if (!photos.ok) return res.status(400).json({ message: photos.message, code: photos.code });
    const { stored } = photos;

    const droppedIds = currentIds.filter((id) => !keepIds.includes(id)).map((id) => BigInt(id));
    const dropped = droppedIds.length
      ? await prisma.media.findMany({ where: { id: { in: droppedIds }, collection_name: "review_images" } })
      : [];
    const nextStatus: ProductReviewStatus =
      review.status === "approved" && env.reviewsRequireApproval ? "pending" : review.status;

    try {
      const updated = await prisma.$transaction(async (tx) => {
        if (dropped.length) await tx.media.deleteMany({ where: { id: { in: dropped.map((row) => row.id) } } });
        const newIds = await createPhotoRows(tx, stored, review.id, review.user_id, product.name, keepIds.length);
        return tx.productReview.update({
          where: { id: review.id },
          data: {
            ...(author_name ? { author_name } : {}),
            rating,
            title: title ?? null,
            comment,
            images: [...keepIds, ...newIds],
            status: nextStatus,
          },
        });
      });
      removeReviewMediaFiles(dropped);

      const media = await loadReviewMedia([updated]);
      return res.json({
        message:
          updated.status === "approved"
            ? "Your review has been updated."
            : "Your review has been updated and will appear once our team has checked it.",
        status: updated.status,
        review: toOwnReview(updated, media),
      });
    } catch (error) {
      removeFiles(stored.map((item) => item.absolutePath));
      throw error;
    }
  }),
);

/** The author permanently deletes their own review (and its photos); they may review again later. */
productReviewsRouter.delete(
  "/:reviewId",
  manageLimiter,
  optionalAuth,
  asyncHandler(async (req, res) => {
    const parsed = reviewContactSchema.safeParse(req.body ?? {});
    if (!parsed.success) return validationError(res, parsed.error);
    if (!hasIdentity(req, parsed.data)) return contactRequired(res);

    const loaded = await loadOwnReview(req, parsed.data);
    if (!loaded.ok) return res.status(loaded.status).json({ message: loaded.message, code: loaded.code });
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

    return res.json({ message: "Your review has been deleted.", id: review.id.toString() });
  }),
);
