import { z } from "zod";
import type { ProductCsvColumn } from "../lib/productCsv.js";
import { withSafeInput } from "./customerAuth.js";

export const PRODUCT_STATUSES = ["draft", "active", "archived", "out_of_stock"] as const;
export const BULK_MAX_IDS = 500;

const idSchema = z.string().regex(/^\d{1,19}$/, "Invalid product id");

export const bulkProductIdsSchema = z
  .array(idSchema)
  .min(1, "Select at least one product")
  .max(BULK_MAX_IDS, `Select at most ${BULK_MAX_IDS} products`)
  .transform((ids) => [...new Set(ids)]);

const money = z.number().finite().min(0).max(99_999_999);

export const PRICE_MODES = [
  "set",
  "increase_percent",
  "decrease_percent",
  "increase_amount",
  "decrease_amount",
] as const;
export const STOCK_MODES = ["set", "increase", "decrease"] as const;

export const bulkProductChangesSchema = z
  .object({
    status: z.enum(PRODUCT_STATUSES).optional(),
    category_id: idSchema.optional(),
    brand_id: idSchema.nullable().optional(),
    is_featured: z.boolean().optional(),
    price: z
      .object({ mode: z.enum(PRICE_MODES), value: money })
      .refine((p) => p.mode !== "decrease_percent" || p.value <= 100, {
        message: "A price decrease can be at most 100%",
      })
      .optional(),
    compare_at_price: money.nullable().optional(),
    stock: z
      .object({ mode: z.enum(STOCK_MODES), value: z.number().int().min(0).max(10_000_000) })
      .optional(),
    shipping_fee: z.number().finite().min(0).max(1_000_000).nullable().optional(),
  })
  .strict()
  .refine((c) => Object.values(c).some((v) => v !== undefined), {
    message: "Choose at least one field to change",
  });

export type BulkProductChanges = z.infer<typeof bulkProductChangesSchema>;

/** Fields moderators may bulk-edit (quality control, no pricing or stock). */
export const MODERATOR_BULK_FIELDS = ["status", "category_id", "brand_id", "is_featured"] as const;

export const bulkProductUpdateSchema = z.object({
  ids: bulkProductIdsSchema,
  changes: bulkProductChangesSchema,
});

export const bulkProductDeleteSchema = z.object({ ids: bulkProductIdsSchema });

export const exportProductsQuerySchema = z.object({
  q: withSafeInput(z.string().trim().max(120)).optional(),
  vendor_id: idSchema.optional(),
  category_id: idSchema.optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  /** Comma-separated product ids — export just the selection. */
  ids: z
    .string()
    .max(BULK_MAX_IDS * 20)
    .transform((s) => s.split(",").map((v) => v.trim()).filter(Boolean))
    .pipe(z.array(idSchema).max(BULK_MAX_IDS))
    .optional(),
});

export const IMPORT_MODES = ["upsert", "create", "update"] as const;

export const importProductsOptionsSchema = z.object({
  mode: z.enum(IMPORT_MODES).default("upsert"),
  dry_run: z
    .enum(["true", "false", "1", "0"])
    .default("true")
    .transform((v) => v === "true" || v === "1"),
});

/* ---------- CSV cells ---------- */

/** Empty cell → null (clears an optional field). */
function optionalText(max: number) {
  return withSafeInput(z.string().max(max, `Must be at most ${max} characters`)).transform((v) =>
    v === "" ? null : v,
  );
}

const moneyCell = z
  .string()
  .transform((v) => v.replace(/[৳,\s]/g, "").replace(/^tk/i, ""))
  .pipe(
    z.union([
      z.literal("").transform(() => null),
      z
        .string()
        .regex(/^\d+(\.\d{1,2})?$/, "Must be a number with up to 2 decimals")
        .transform(Number)
        .pipe(money),
    ]),
  );

const STATUS_ALIASES: Record<string, (typeof PRODUCT_STATUSES)[number]> = {
  draft: "draft",
  active: "active",
  publish: "active",
  published: "active",
  archived: "archived",
  out_of_stock: "out_of_stock",
  "out of stock": "out_of_stock",
};

const BOOL_TRUE = ["1", "true", "yes", "y"];
const BOOL_FALSE = ["0", "false", "no", "n", ""];

export const productCsvCellSchemas: Partial<Record<ProductCsvColumn, z.ZodType>> = {
  Handle: withSafeInput(
    z
      .string()
      .toLowerCase()
      .max(270)
      .regex(/^([a-z0-9]+(?:-[a-z0-9]+)*)?$/, "Handle must be lowercase letters, numbers, and hyphens"),
  ).transform((v) => (v === "" ? null : v)),
  Title: withSafeInput(z.string().max(255)).transform((v) => (v === "" ? null : v)),
  Status: z
    .string()
    .transform((v, ctx) => {
      if (v === "") return null;
      const status = STATUS_ALIASES[v.toLowerCase()];
      if (!status) {
        ctx.addIssue({ code: "custom", message: "Status must be draft, active, archived or out_of_stock" });
        return z.NEVER;
      }
      return status;
    }),
  /** Shopify's "Type" is a free-text product type, so anything but simple / variable is ignored. */
  Type: z.string().transform((v) => {
    const lower = v.toLowerCase();
    return lower === "simple" || lower === "variable" ? lower : null;
  }),
  SKU: optionalText(100),
  Barcode: optionalText(64),
  Price: moneyCell,
  "Compare At Price": moneyCell,
  "Cost Price": moneyCell,
  Stock: z
    .string()
    .transform((v) => v.replace(/[,\s]/g, ""))
    .pipe(
      z.union([
        z.literal("").transform(() => null),
        z.string().regex(/^\d+$/, "Stock must be a whole number").transform(Number).pipe(z.number().max(10_000_000)),
      ]),
    ),
  Category: optionalText(270),
  Brand: optionalText(270),
  Store: optionalText(270),
  "Short Description": optionalText(500),
  "Description (HTML)": z.string().max(20_000, "Description must be at most 20,000 characters"),
  "Shipping Fee": moneyCell,
  Featured: z.string().transform((v, ctx) => {
    const lower = v.toLowerCase();
    if (BOOL_TRUE.includes(lower)) return true;
    if (BOOL_FALSE.includes(lower)) return false;
    ctx.addIssue({ code: "custom", message: "Featured must be yes or no" });
    return z.NEVER;
  }),
  "Meta Title": optionalText(160),
  "Meta Description": optionalText(320),
};
