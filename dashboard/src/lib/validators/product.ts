import { z } from "zod";
import {
  firstZodError,
  findUnsafeInputReason,
  validateSafeImageFile,
  withSafeInput,
} from "./safeInput";

export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_MAX_COUNT = 12;

/** TipTap HTML may include tags; still block scripts / PHP / JS / SQL payloads. */
function findUnsafeRichTextReason(value: string): string | null {
  if (/<\s*\/?\s*script\b/i.test(value)) return "Script tags are not allowed";
  if (/<\?(?:php|=)?|\?>/i.test(value)) return "PHP code is not allowed";
  if (/javascript\s*:/i.test(value)) return "JavaScript URLs are not allowed";
  if (/\bon[a-z]+\s*=/i.test(value)) return "HTML event handlers are not allowed";
  if (
    /(\beval\s*\()|(\bFunction\s*\()|(\bdocument\.(cookie|write)\b)/i.test(value)
  ) {
    return "JavaScript code is not allowed";
  }
  if (
    /(\bunion\s+select\b)|(\bdrop\s+(table|database)\b)|(\btruncate\s+table\b)/i.test(
      value,
    )
  ) {
    return "SQL-like patterns are not allowed";
  }
  return null;
}

function withSafeRichText<T extends z.ZodType<string>>(schema: T) {
  return schema.superRefine((value, ctx) => {
    const reason = findUnsafeRichTextReason(value);
    if (reason) ctx.addIssue({ code: "custom", message: reason });
  });
}

const optionDraftSchema = z.object({
  name: withSafeInput(z.string().trim().max(80)),
  valuesText: withSafeInput(z.string().trim().max(500)),
});

const variantDraftSchema = z.object({
  title: withSafeInput(z.string().trim().max(255)),
  price: z.number().min(0).max(99_999_999),
  stock_qty: z.number().int().min(0).max(10_000_000),
  option_values: z.record(z.string(), z.string()),
});

export const productFormSchema = z
  .object({
    vendor_id: z.string(),
    category_id: z.string().min(1, "Select a category"),
    brand_id: z.string().min(1, "Select a brand"),
    name: withSafeInput(
      z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters")
        .max(255),
    ),
    slug: withSafeInput(
      z
        .string()
        .trim()
        .min(2, "Slug must be at least 2 characters")
        .max(270)
        .regex(
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
          "Slug must be lowercase letters, numbers, and hyphens",
        ),
    ),
    short_description: withSafeInput(z.string().trim().max(500)),
    description: withSafeRichText(z.string().max(20_000)),
    type: z.enum(["simple", "variable"]),
    status: z.enum(["draft", "active"]),
    price: z.number().min(0).max(99_999_999),
    stock_qty: z.number().int().min(0).max(10_000_000),
    options: z.array(optionDraftSchema).max(5),
    variants: z.array(variantDraftSchema).max(200),
  })
  .superRefine((data, ctx) => {
    if (data.type === "variable") {
      const usable = data.options
        .map((o) => ({
          name: o.name.trim(),
          values: o.valuesText
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
        }))
        .filter((o) => o.name && o.values.length > 0);
      if (usable.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Add at least one option with values for variant products",
          path: ["options"],
        });
      }
    }
  });

export type ProductFormValues = z.infer<typeof productFormSchema>;

export function toProductApiBody(
  values: ProductFormValues,
  opts: { includeVendor: boolean },
) {
  const body: Record<string, unknown> = {
    category_id: values.category_id,
    brand_id: values.brand_id,
    name: values.name,
    slug: values.slug,
    short_description: values.short_description.trim()
      ? values.short_description.trim()
      : null,
    description: values.description.trim() ? values.description.trim() : null,
    type: values.type,
    status: values.status,
    price: values.price,
    stock_qty: values.stock_qty,
  };

  if (opts.includeVendor && values.vendor_id) {
    body.vendor_id = values.vendor_id;
  }

  if (values.type === "variable") {
    body.options = values.options
      .map((o) => ({
        name: o.name.trim(),
        values: o.valuesText
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      }))
      .filter((o) => o.name && o.values.length > 0);
    body.variants = values.variants.map((v) => ({
      title: v.title,
      price: v.price,
      stock_qty: v.stock_qty,
      option_values: v.option_values,
    }));
  }

  return body;
}

export function validateProductImageFile(file: File | null | undefined) {
  return validateSafeImageFile(file, PRODUCT_IMAGE_MAX_BYTES, "Product image");
}

export function validateProductImages(files: File[]) {
  if (files.length > PRODUCT_IMAGE_MAX_COUNT) {
    return {
      ok: false as const,
      message: `You can upload at most ${PRODUCT_IMAGE_MAX_COUNT} images`,
    };
  }
  for (const file of files) {
    const checked = validateProductImageFile(file);
    if (!checked.ok) return checked;
  }
  return { ok: true as const };
}

export { firstZodError, findUnsafeInputReason };
