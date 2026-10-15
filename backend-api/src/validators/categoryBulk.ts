import { z } from "zod";
import { CATEGORY_ICON_NAMES } from "../lib/categoryIconNames.js";
import type { CategoryCsvColumn } from "../lib/categoryCsv.js";
import { withSafeInput } from "./customerAuth.js";
import { IMPORT_MODES } from "./productBulk.js";

const idSchema = z.string().regex(/^\d{1,19}$/, "Invalid category id");
export const CATEGORY_EXPORT_MAX_IDS = 500;

export const exportCategoriesQuerySchema = z.object({
  q: withSafeInput(z.string().trim().max(120)).optional(),
  active: z.enum(["true", "false", "all"]).optional().default("all"),
  /** `zip` bundles cover images under `images/`; `csv` writes image URLs. */
  format: z.enum(["csv", "zip"]).default("csv"),
  ids: z
    .string()
    .max(CATEGORY_EXPORT_MAX_IDS * 20)
    .transform((s) => s.split(",").map((v) => v.trim()).filter(Boolean))
    .pipe(z.array(idSchema).max(CATEGORY_EXPORT_MAX_IDS))
    .optional(),
});

export const importCategoriesOptionsSchema = z.object({
  mode: z.enum(IMPORT_MODES).default("upsert"),
  dry_run: z
    .enum(["true", "false", "1", "0"])
    .default("true")
    .transform((v) => v === "true" || v === "1"),
});

/* ---------- CSV cells ---------- */

function optionalText(max: number) {
  return withSafeInput(z.string().max(max, `Must be at most ${max} characters`)).transform((v) =>
    v === "" ? null : v,
  );
}

const slugCell = withSafeInput(
  z
    .string()
    .toLowerCase()
    .max(160, "Must be at most 160 characters")
    .regex(/^([a-z0-9]+(?:-[a-z0-9]+)*)?$/, "Must be lowercase letters, numbers, and hyphens"),
).transform((v) => (v === "" ? null : v));

const ICONS = new Map(CATEGORY_ICON_NAMES.map((name) => [name.toLowerCase(), name]));

export const categoryCsvCellSchemas: Record<CategoryCsvColumn, z.ZodType> = {
  Handle: slugCell,
  Name: withSafeInput(z.string().max(150, "Name must be at most 150 characters")).transform((v) =>
    v === "" ? null : v,
  ),
  Parent: slugCell,
  Description: optionalText(5000),
  Icon: z.string().transform((v, ctx) => {
    if (v === "") return null;
    const icon = ICONS.get(v.toLowerCase());
    if (!icon) {
      ctx.addIssue({ code: "custom", message: `Unknown icon "${v.slice(0, 40)}"` });
      return z.NEVER;
    }
    return icon;
  }),
  Status: z.string().transform((v, ctx) => {
    const lower = v.toLowerCase();
    if (lower === "") return null;
    if (["active", "1", "true", "yes", "published", "publish"].includes(lower)) return true;
    if (["inactive", "0", "false", "no", "hidden", "draft"].includes(lower)) return false;
    ctx.addIssue({ code: "custom", message: "Status must be active or inactive" });
    return z.NEVER;
  }),
  "Sort Order": z
    .string()
    .transform((v) => v.replace(/[,\s]/g, ""))
    .pipe(
      z.union([
        z.literal("").transform(() => null),
        z
          .string()
          .regex(/^\d+$/, "Sort order must be a whole number")
          .transform(Number)
          .pipe(z.number().max(999_999, "Sort order must be at most 999999")),
      ]),
    ),
  "Meta Title": optionalText(160),
  "Meta Description": optionalText(320),
  Image: withSafeInput(z.string().max(1000, "Image must be at most 1000 characters")).transform((v) =>
    v === "" ? null : v,
  ),
};
