import { z } from "zod";
import { phoneField, withSafeInput } from "./customerAuth.js";

export const PRODUCT_REVIEW_STATUSES = ["pending", "approved", "hidden", "rejected"] as const;
export type ProductReviewStatusValue = (typeof PRODUCT_REVIEW_STATUSES)[number];

const optionalEmail = z
  .union([z.literal(""), withSafeInput(z.string().trim().toLowerCase().email("Enter a valid email").max(255))])
  .optional()
  .transform((value) => value || undefined);

const optionalPhone = z
  .union([z.literal(""), phoneField])
  .optional()
  .transform((value) => value || undefined);

export const CONTACT_REQUIRED_MESSAGE = "Enter the email or phone number you used at checkout";

/**
 * The email and/or phone used at checkout. Routes require at least one unless the
 * request is signed in (then the customer's own orders and reviews are matched).
 */
export const reviewContactSchema = z.object({ email: optionalEmail, phone: optionalPhone });

export type ReviewContact = z.infer<typeof reviewContactSchema>;

/** Multipart text fields arrive as strings; `rating` is coerced. */
export const createReviewSchema = z
  .object({
    email: optionalEmail,
    phone: optionalPhone,
    /** Display name override; defaults to the order's shipping name. */
    author_name: z
      .union([
        z.literal(""),
        withSafeInput(
          z
            .string()
            .trim()
            .min(2, "Name must be at least 2 characters")
            .max(80, "Name must be 80 characters or fewer"),
        ),
      ])
      .optional()
      .transform((value) => value || undefined),
    rating: z.coerce.number().int().min(1, "Pick a rating from 1 to 5").max(5, "Pick a rating from 1 to 5"),
    title: z
      .union([z.literal(""), withSafeInput(z.string().trim().max(150, "Title must be 150 characters or fewer"))])
      .optional()
      .transform((value) => value || undefined),
    comment: withSafeInput(
      z
        .string()
        .trim()
        .min(10, "Write at least 10 characters")
        .max(2000, "Review must be 2000 characters or fewer"),
    ),
  });

/** Edit own review: same fields plus the ids of existing photos to keep (repeat the field or comma-separate). */
export const updateOwnReviewSchema = createReviewSchema.extend({
  keep_images: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) =>
      (value === undefined ? [] : Array.isArray(value) ? value : [value])
        .flatMap((item) => item.split(","))
        .map((item) => item.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().regex(/^\d{1,19}$/, "Invalid photo id")).max(4)),
});

export const reviewIdParamSchema = z.string().regex(/^\d{1,19}$/, "Invalid review id");

export const publicReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  sort: z.enum(["newest", "highest", "lowest"]).default("newest"),
});

export const listReviewsQuerySchema = z.object({
  status: z.enum(["all", ...PRODUCT_REVIEW_STATUSES]).default("all"),
  flagged: z.enum(["true", "false"]).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  product_id: z.string().regex(/^\d{1,19}$/).optional(),
  q: z
    .union([z.literal(""), withSafeInput(z.string().trim().max(120))])
    .optional()
    .transform((value) => value || undefined),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateReviewStatusSchema = z.object({
  status: z.enum(PRODUCT_REVIEW_STATUSES),
});

export const flagReviewSchema = z.object({
  flagged: z.boolean(),
  reason: z
    .union([z.literal(""), withSafeInput(z.string().trim().max(255))])
    .optional()
    .transform((value) => value || undefined),
});

export const vendorReplySchema = z.object({
  /** Empty string removes the reply. */
  reply: z.union([
    z.literal(""),
    withSafeInput(z.string().trim().min(2, "Reply is too short").max(1000, "Reply must be 1000 characters or fewer")),
  ]),
});
