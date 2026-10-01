import { z } from "zod";
import { CATEGORY_ICON_NAMES } from "../lib/categoryIconNames.js";
import { withSafeInput } from "./customerAuth.js";

const iconSchema = z.enum(CATEGORY_ICON_NAMES, {
  message: "Icon must be a registered category icon",
});

export const categoryListQuerySchema = z.object({
  q: withSafeInput(z.string().trim().max(120)).optional(),
  parent_id: z.string().regex(/^\d+$/).optional().nullable(),
  active: z.enum(["true", "false", "all"]).optional().default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const createCategorySchema = z.object({
  name: withSafeInput(z.string().trim().min(2).max(150)),
  slug: withSafeInput(
    z
      .string()
      .trim()
      .min(2)
      .max(160)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must be lowercase letters, numbers, and hyphens",
      ),
  ).optional(),
  description: z
    .union([withSafeInput(z.string().trim().max(5000)), z.null()])
    .optional(),
  icon: z.union([iconSchema, z.null()]).optional(),
  parent_id: z
    .union([z.string().regex(/^\d+$/), z.null()])
    .optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(999_999).optional(),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  name: withSafeInput(z.string().trim().min(2).max(150)).optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
