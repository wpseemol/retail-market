import { z } from "zod";
import { withSafeInput } from "./customerAuth.js";

export const brandListQuerySchema = z.object({
  q: withSafeInput(z.string().trim().max(120)).optional(),
  active: z.enum(["true", "false", "all"]).optional().default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const createBrandSchema = z.object({
  name: withSafeInput(z.string().trim().min(2).max(120)),
  slug: withSafeInput(
    z
      .string()
      .trim()
      .min(2)
      .max(140)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must be lowercase letters, numbers, and hyphens",
      ),
  ).optional(),
  description: z
    .union([withSafeInput(z.string().trim().max(500)), z.null()])
    .optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(999_999).optional(),
});

export const updateBrandSchema = createBrandSchema.partial().extend({
  name: withSafeInput(z.string().trim().min(2).max(120)).optional(),
});

export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
