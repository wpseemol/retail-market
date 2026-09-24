import { z } from "zod";
import { firstZodError, withSafeInput } from "./safeInput";

export const BRAND_IMAGE_MAX_BYTES = 1 * 1024 * 1024;
export const BRAND_IMAGE_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

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

export function validateBrandImageFile(
  file: File | null | undefined,
): { ok: true } | { ok: false; message: string } {
  if (!file) return { ok: true };

  if (!(BRAND_IMAGE_ALLOWED_TYPES as readonly string[]).includes(file.type)) {
    return {
      ok: false,
      message: "Only JPEG, PNG, WebP, or GIF images are allowed",
    };
  }

  if (file.size > BRAND_IMAGE_MAX_BYTES) {
    return {
      ok: false,
      message: "Brand image must be 1 MB or smaller",
    };
  }

  const name = file.name ?? "";
  if (
    name.length > 255 ||
    /[<>]|<\?|javascript:|\.svg$/i.test(name) ||
    /\.(php|js|mjs|cjs|html|htm|exe|sh|bat)$/i.test(name)
  ) {
    return { ok: false, message: "Invalid image file name" };
  }

  return { ok: true };
}

export { firstZodError };
