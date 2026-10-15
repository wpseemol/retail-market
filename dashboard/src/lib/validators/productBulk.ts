import { z } from "zod";

/** Mirrors `PRODUCT_CSV_MAX_BYTES` / `PRODUCT_CSV_MAX_ROWS` in backend-api `lib/productCsv.ts`. */
export const PRODUCT_CSV_MAX_BYTES = 2 * 1024 * 1024;
export const PRODUCT_CSV_MAX_ROWS = 1000;
export const PRODUCT_BULK_MAX_IDS = 500;

export const IMPORT_MODES = ["upsert", "create", "update"] as const;
export type ImportMode = (typeof IMPORT_MODES)[number];

export const IMPORT_MODE_LABELS: Record<ImportMode, { label: string; hint: string }> = {
  upsert: { label: "Create and update", hint: "New handles are created, existing handles are updated" },
  create: { label: "Create only", hint: "Rows whose handle already exists are skipped" },
  update: { label: "Update only", hint: "Rows without a matching handle are skipped" },
};

const CSV_TYPES = ["text/csv", "application/vnd.ms-excel", "text/plain", "application/csv", ""];

export function validateProductCsvFile(file: File | null | undefined): string | null {
  if (!file) return "Choose a CSV file";
  if (!/\.csv$/i.test(file.name)) return "Upload a .csv file";
  if (!CSV_TYPES.includes(file.type)) return "Upload a .csv file";
  if (file.name.length > 255 || /[<>]|<\?|javascript:/i.test(file.name)) return "Invalid file name";
  if (file.size === 0) return "The file is empty";
  if (file.size > PRODUCT_CSV_MAX_BYTES) return "CSV must be 2 MB or smaller";
  return null;
}

export const productImportFormSchema = z.object({
  file: z.custom<File | null>().superRefine((file, ctx) => {
    const reason = validateProductCsvFile(file);
    if (reason) ctx.addIssue({ code: "custom", message: reason });
  }),
  mode: z.enum(IMPORT_MODES),
});

export type ProductImportFormValues = z.infer<typeof productImportFormSchema>;

export const PRICE_MODES = [
  "set",
  "increase_percent",
  "decrease_percent",
  "increase_amount",
  "decrease_amount",
] as const;
export const PRICE_MODE_LABELS: Record<(typeof PRICE_MODES)[number], string> = {
  set: "Set to",
  increase_percent: "Increase by %",
  decrease_percent: "Decrease by %",
  increase_amount: "Increase by ৳",
  decrease_amount: "Decrease by ৳",
};
export const STOCK_MODES = ["set", "increase", "decrease"] as const;
export const STOCK_MODE_LABELS: Record<(typeof STOCK_MODES)[number], string> = {
  set: "Set to",
  increase: "Add",
  decrease: "Remove",
};

/** `"keep"` = leave the field unchanged on every selected product. */
export const productBulkEditFormSchema = z
  .object({
    status: z.enum(["keep", "draft", "active", "archived", "out_of_stock"]),
    category_id: z.string(),
    brand_id: z.string(),
    featured: z.enum(["keep", "yes", "no"]),
    price_mode: z.enum(["keep", ...PRICE_MODES]),
    price_value: z.number({ message: "Enter a number" }).finite().min(0).max(99_999_999).optional(),
    stock_mode: z.enum(["keep", ...STOCK_MODES]),
    stock_value: z
      .number({ message: "Enter a whole number" })
      .int("Enter a whole number")
      .min(0)
      .max(10_000_000)
      .optional(),
  })
  .superRefine((v, ctx) => {
    if (v.price_mode !== "keep" && v.price_value === undefined) {
      ctx.addIssue({ code: "custom", path: ["price_value"], message: "Enter a price or percentage" });
    }
    if (v.price_mode === "decrease_percent" && (v.price_value ?? 0) > 100) {
      ctx.addIssue({ code: "custom", path: ["price_value"], message: "A decrease can be at most 100%" });
    }
    if (v.stock_mode !== "keep" && v.stock_value === undefined) {
      ctx.addIssue({ code: "custom", path: ["stock_value"], message: "Enter a quantity" });
    }
    const changed =
      v.status !== "keep" ||
      v.category_id !== "keep" ||
      v.brand_id !== "keep" ||
      v.featured !== "keep" ||
      v.price_mode !== "keep" ||
      v.stock_mode !== "keep";
    if (!changed) {
      ctx.addIssue({ code: "custom", path: ["status"], message: "Choose at least one field to change" });
    }
  });

export type ProductBulkEditFormValues = z.infer<typeof productBulkEditFormSchema>;

export function toBulkChanges(v: ProductBulkEditFormValues) {
  const changes: Record<string, unknown> = {};
  if (v.status !== "keep") changes.status = v.status;
  if (v.category_id !== "keep") changes.category_id = v.category_id;
  if (v.brand_id !== "keep") changes.brand_id = v.brand_id === "none" ? null : v.brand_id;
  if (v.featured !== "keep") changes.is_featured = v.featured === "yes";
  if (v.price_mode !== "keep") changes.price = { mode: v.price_mode, value: v.price_value };
  if (v.stock_mode !== "keep") changes.stock = { mode: v.stock_mode, value: v.stock_value };
  return changes;
}
