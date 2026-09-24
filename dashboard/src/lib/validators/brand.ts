import { z } from "zod";
import { firstZodError, withSafeInput } from "./safeInput";

/** Form input schema (RHF-friendly — no null transforms). */
export const brandFormSchema = z.object({
  name: withSafeInput(
    z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(120, "Name must be at most 120 characters"),
  ),
  slug: withSafeInput(
    z
      .string()
      .trim()
      .min(2, "Slug must be at least 2 characters")
      .max(140)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must be lowercase letters, numbers, and hyphens",
      ),
  ),
  description: withSafeInput(z.string().trim().max(500)),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0).max(999_999),
});

export type BrandFormValues = z.infer<typeof brandFormSchema>;

export function toBrandApiBody(values: BrandFormValues) {
  return {
    name: values.name,
    slug: values.slug,
    description: values.description.trim() ? values.description.trim() : null,
    is_active: values.is_active,
    sort_order: values.sort_order,
  };
}

export function validateBrandForm(input: unknown) {
  return brandFormSchema.safeParse(input);
}

export { firstZodError };
