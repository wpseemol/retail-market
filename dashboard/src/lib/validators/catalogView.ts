import { z } from "zod";

/** Shared catalog list pages: Products, Categories, Brands. */
export const catalogViewModeSchema = z.enum(["grid", "list"]);

export type CatalogViewMode = z.infer<typeof catalogViewModeSchema>;

export const CATALOG_VIEW_MODES = catalogViewModeSchema.options;

export function parseCatalogViewMode(
  value: unknown,
  fallback: CatalogViewMode = "grid",
): CatalogViewMode {
  const parsed = catalogViewModeSchema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}
