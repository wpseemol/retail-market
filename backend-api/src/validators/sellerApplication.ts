import { z } from "zod";
import { findUnsafeInputReason } from "./customerAuth.js";

function withSafeInput(schema: z.ZodString) {
  return schema.superRefine((value, ctx) => {
    const reason = findUnsafeInputReason(value);
    if (reason) ctx.addIssue({ code: "custom", message: reason });
  });
}

export const SELLER_DOC_TYPES = [
  "nid_front",
  "nid_back",
  "birth_certificate",
  "trade_license",
  "other",
] as const;

export const SELLER_APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
] as const;

const optionalSafe = (max: number) =>
  z
    .union([withSafeInput(z.string().trim().max(max)), z.null()])
    .transform((v) => (v ? v : null))
    .optional();

export const upsertSellerApplicationSchema = z
  .object({
    shop_name: withSafeInput(z.string().trim().min(2).max(200)).optional(),
    shop_name_bn: optionalSafe(200),
    description: optionalSafe(5000),
    contact_phone: optionalSafe(30),
    business_address: optionalSafe(500),
  })
  .strict();

export const uploadSellerDocumentSchema = z
  .object({
    doc_type: z.enum(SELLER_DOC_TYPES),
    label: optionalSafe(120),
  })
  .strict();

export const submitSellerApplicationSchema = z
  .object({
    accept_fee_terms: z.literal(true),
  })
  .strict();

export const reviewSellerApplicationSchema = z
  .object({
    action: z.enum(["approve", "reject"]),
    rejection_reason: withSafeInput(z.string().trim().min(3).max(1000)).optional(),
    activate_shop: z.boolean().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.action === "reject" && !data.rejection_reason?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["rejection_reason"],
        message: "Rejection reason is required",
      });
    }
  });

export const listSellerApplicationsQuerySchema = z.object({
  status: z.enum(SELLER_APPLICATION_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: withSafeInput(z.string().trim().max(100)).optional(),
});
