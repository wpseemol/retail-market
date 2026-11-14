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

/** Page sizes for catalog lists (API limit max 100). */
export const CATALOG_PAGE_SIZES = [12, 24, 48] as const;

export const catalogPageSizeSchema = z
  .number()
  .int()
  .refine(
    (n): n is (typeof CATALOG_PAGE_SIZES)[number] =>
      (CATALOG_PAGE_SIZES as readonly number[]).includes(n),
    { message: "Invalid page size" },
  );

export const CATALOG_PAGE_SIZE_DEFAULT: (typeof CATALOG_PAGE_SIZES)[number] = 12;

export type CatalogPageSize = (typeof CATALOG_PAGE_SIZES)[number];

export function parseCatalogPageSize(
  value: unknown,
  fallback: CatalogPageSize = CATALOG_PAGE_SIZE_DEFAULT,
): CatalogPageSize {
  const n = typeof value === "string" ? Number(value) : value;
  const parsed = catalogPageSizeSchema.safeParse(n);
  return parsed.success ? parsed.data : fallback;
}

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
