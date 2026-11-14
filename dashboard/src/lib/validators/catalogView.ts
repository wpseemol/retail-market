import { z } from "zod";

/**
 * Shared catalog list pages: Products, Categories, Brands.
 * Matches storefront shop density: 4 / 3 / 2 column grids + list.
 */
export const catalogViewModeSchema = z.enum([
  "grid4",
  "grid3",
  "grid2",
  "list",
]);

export type CatalogViewMode = z.infer<typeof catalogViewModeSchema>;

export const CATALOG_VIEW_MODES = catalogViewModeSchema.options;

export const CATALOG_VIEW_DEFAULT: CatalogViewMode = "grid3";

/** Legacy single `grid` preference → `grid3`. */
export function parseCatalogViewMode(
  value: unknown,
  fallback: CatalogViewMode = CATALOG_VIEW_DEFAULT,
): CatalogViewMode {
  if (value === "grid") return "grid3";
  const parsed = catalogViewModeSchema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

export function isCatalogListView(mode: CatalogViewMode) {
  return mode === "list";
}

export function isCatalogGridView(mode: CatalogViewMode) {
  return mode !== "list";
}
