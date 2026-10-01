import fs from "node:fs";
import path from "node:path";
import type { Media, Prisma, ProductReview } from "@prisma/client";
import { prisma } from "./prisma.js";
import { mediaPublicUrl } from "./user.js";
import { maskEmail, maskPhone } from "./phone.js";
import type { ReviewContact } from "../validators/productReview.js";

export const REVIEW_NOT_PURCHASED_MESSAGE =
  "Only customers who purchased and received this product can leave a review.";
export const REVIEW_ALREADY_SUBMITTED_MESSAGE = "You have already reviewed this product.";

export type EligibleOrder = {
  id: bigint;
  user_id: bigint | null;
  author_name: string;
  customer_email: string | null;
  customer_phone: string | null;
};

export type EligibilityResult =
  | { ok: true; order: EligibleOrder }
  | { ok: false; reason: "not_purchased" | "already_reviewed" };

function contactFilters(contact: ReviewContact, userId?: bigint) {
  const order: Prisma.OrderWhereInput[] = [];
  const review: Prisma.ProductReviewWhereInput[] = [];
  if (contact.email) {
    order.push({ customer_email: contact.email });
    review.push({ author_email: contact.email });
  }
  if (contact.phone) {
    order.push({ customer_phone: contact.phone });
    review.push({ author_phone: contact.phone });
  }
  if (userId) {
    order.push({ user_id: userId });
    review.push({ user_id: userId });
  }
  return { order, review };
}

/**
 * A review needs a paid + delivered order containing the product whose checkout email or
 * phone matches (or that belongs to the signed-in customer). COD orders become `paid` on
 * delivery. One review per customer per product, across all of their orders.
 */
export async function findEligibleOrder(
  productId: bigint,
  contact: ReviewContact,
  userId?: bigint,
): Promise<EligibilityResult> {
  const filters = contactFilters(contact, userId);
  if (filters.order.length === 0) return { ok: false, reason: "not_purchased" };

  const existing = await findOwnReview(productId, contact, userId);
  if (existing) return { ok: false, reason: "already_reviewed" };

  const order = await prisma.order.findFirst({
    where: {
      OR: filters.order,
      status: "delivered",
      payment_status: "paid",
      items: { some: { product_id: productId } },
      reviews: { none: { product_id: productId } },
    },
    orderBy: [{ delivered_at: "desc" }, { id: "desc" }],
    select: {
      id: true,
      user_id: true,
      customer_email: true,
      customer_phone: true,
      addresses: { where: { type: "shipping" }, select: { full_name: true }, take: 1 },
      user: { select: { first_name: true, last_name: true } },
    },
  });
  if (!order) return { ok: false, reason: "not_purchased" };

  const fromUser = order.user ? `${order.user.first_name} ${order.user.last_name}`.trim() : "";
  const authorName = (order.addresses[0]?.full_name || fromUser || "Verified buyer").slice(0, 150);
  return {
    ok: true,
    order: {
      id: order.id,
      user_id: order.user_id,
      author_name: authorName,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
    },
  };
}

/**
 * The review this buyer already left on the product, matched by checkout email/phone, the
 * order's contact, or the signed-in account. Proof of ownership for edit/delete.
 */
export async function findOwnReview(productId: bigint, contact: ReviewContact, userId?: bigint) {
  const filters = contactFilters(contact, userId);
  if (filters.order.length === 0) return null;
  return prisma.productReview.findFirst({
    where: {
      product_id: productId,
      deleted_at: null,
      OR: [...filters.review, { order: { OR: filters.order } }],
    },
    orderBy: { created_at: "desc" },
  });
}

export function publicAuthorName(fullName: string) {
  return fullName.trim().replace(/\s+/g, " ") || "Verified buyer";
}

export function removeReviewMediaFiles(rows: Pick<Media, "file_path" | "file_name">[]) {
  for (const row of rows) {
    try {
      fs.unlinkSync(path.resolve(process.cwd(), "uploads", row.file_path, row.file_name));
    } catch {
      /* already gone */
    }
  }
}

export function reviewImageIds(review: Pick<ProductReview, "images">): bigint[] {
  if (!Array.isArray(review.images)) return [];
  return review.images
    .filter((value): value is string => typeof value === "string" && /^\d{1,19}$/.test(value))
    .map((value) => BigInt(value));
}

/** Loads every photo for a page of reviews in one query. */
export async function loadReviewMedia(reviews: Pick<ProductReview, "images">[]) {
  const ids = reviews.flatMap(reviewImageIds);
  if (ids.length === 0) return new Map<string, Media>();
  const rows = await prisma.media.findMany({ where: { id: { in: ids }, collection_name: "review_images" } });
  return new Map(rows.map((row) => [row.id.toString(), row]));
}

function imagesFor(review: Pick<ProductReview, "images">, media: Map<string, Media>) {
  return reviewImageIds(review)
    .map((id) => media.get(id.toString()))
    .filter((row): row is Media => Boolean(row))
    .map((row) => ({ id: row.id.toString(), url: mediaPublicUrl(row) }));
}

export function toPublicReview(review: ProductReview, media: Map<string, Media>) {
  return {
    id: review.id.toString(),
    author_name: publicAuthorName(review.author_name),
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    images: imagesFor(review, media),
    is_verified_purchase: review.is_verified_purchase,
    vendor_reply: review.vendor_reply,
    vendor_replied_at: review.vendor_replied_at?.toISOString() ?? null,
    created_at: review.created_at.toISOString(),
  };
}

/** The buyer's own review, including its moderation status (shown only to its author). */
export function toOwnReview(review: ProductReview, media: Map<string, Media>) {
  return { ...toPublicReview(review, media), status: review.status };
}

export const dashboardReviewInclude = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      vendor_id: true,
      thumbnail: true,
      vendor: { select: { id: true, shop_name: true } },
    },
  },
  order: { select: { id: true, order_number: true } },
  moderator: { select: { id: true, first_name: true, last_name: true, role: true } },
} satisfies Prisma.ProductReviewInclude;

export type DashboardReviewRow = Prisma.ProductReviewGetPayload<{ include: typeof dashboardReviewInclude }>;

/** Vendors manage their store's reviews but don't get the buyer's full contact details. */
export function toDashboardReview(review: DashboardReviewRow, media: Map<string, Media>, role: string) {
  const isVendor = role === "vendor";
  return {
    id: review.id.toString(),
    status: review.status,
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    images: imagesFor(review, media),
    is_verified_purchase: review.is_verified_purchase,
    author_name: review.author_name,
    author_email: review.author_email ? (isVendor ? maskEmail(review.author_email) : review.author_email) : null,
    author_phone: review.author_phone ? (isVendor ? maskPhone(review.author_phone) : review.author_phone) : null,
    flagged: review.flagged_at !== null,
    flagged_at: review.flagged_at?.toISOString() ?? null,
    flag_reason: review.flag_reason,
    vendor_reply: review.vendor_reply,
    vendor_replied_at: review.vendor_replied_at?.toISOString() ?? null,
    moderated_at: review.moderated_at?.toISOString() ?? null,
    moderated_by: review.moderator
      ? {
          id: review.moderator.id.toString(),
          name: `${review.moderator.first_name} ${review.moderator.last_name}`.trim(),
          role: review.moderator.role,
        }
      : null,
    product: {
      id: review.product.id.toString(),
      name: review.product.name,
      slug: review.product.slug,
      thumbnail_url: review.product.thumbnail ? mediaPublicUrl(review.product.thumbnail) : null,
      vendor: review.product.vendor
        ? { id: review.product.vendor.id.toString(), shop_name: review.product.vendor.shop_name }
        : null,
    },
    order: isVendor ? null : { id: review.order.id.toString(), order_number: review.order.order_number },
    created_at: review.created_at.toISOString(),
    updated_at: review.updated_at.toISOString(),
  };
}

/** Average + 1–5 star counts over approved reviews. */
export async function reviewSummary(productId: bigint) {
  const groups = await prisma.productReview.groupBy({
    by: ["rating"],
    where: { product_id: productId, status: "approved", deleted_at: null },
    _count: { _all: true },
  });

  const breakdown: Record<"1" | "2" | "3" | "4" | "5", number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  let count = 0;
  let total = 0;
  for (const group of groups) {
    const key = String(group.rating) as keyof typeof breakdown;
    if (!(key in breakdown)) continue;
    breakdown[key] = group._count._all;
    count += group._count._all;
    total += group.rating * group._count._all;
  }
  return {
    average: count > 0 ? Math.round((total / count) * 10) / 10 : 0,
    count,
    breakdown,
  };
}
