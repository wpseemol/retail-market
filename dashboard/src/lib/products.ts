export type ProductStatus =
  | "draft"
  | "active"
  | "archived"
  | "out_of_stock";

export type ProductType = "simple" | "variable";

export type ProductMedia = {
  id: string;
  path: string;
  file_name: string;
  sort_order?: number;
};

export type ProductOption = {
  id?: string;
  name: string;
  position?: number;
  values: Array<{ id?: string; value: string; color_hex?: string | null }>;
};

export type ProductVariant = {
  id?: string;
  sku?: string | null;
  title?: string | null;
  price: number | null;
  stock_qty: number;
  is_default?: boolean;
  is_active?: boolean;
  option_values?: Array<{ option: string; value: string }>;
};

export type Product = {
  id: string;
  vendor_id: string | null;
  category_id: string | null;
  brand_id?: string | null;
  thumbnail_id?: string | null;
  name: string;
  slug: string;
  sku?: string | null;
  brand_name?: string | null;
  brand?: { id: string | null; name: string; slug: string | null } | null;
  description?: string | null;
  short_description?: string | null;
  name_bn?: string | null;
  short_description_bn?: string | null;
  description_bn?: string | null;
  type: ProductType;
  price: number;
  compare_at_price?: number | null;
  /** Null = store default shipping fee; 0 = free shipping. */
  shipping_fee?: number | null;
  stock_qty: number;
  status: ProductStatus;
  thumbnail?: ProductMedia | null;
  gallery?: ProductMedia[];
  category?: { id: string; name: string; slug: string } | null;
  vendor?: { id: string; shop_name: string; slug: string } | null;
  options?: ProductOption[];
  variants?: ProductVariant[];
};

/** From `GET /api/dashboard/products` — what the current role may do in bulk. */
export type ProductBulkPermissions = {
  export: boolean;
  import: boolean;
  bulk_edit: boolean;
  /** Price / stock / shipping changes (moderators only get status, category, brand, featured). */
  bulk_edit_pricing: boolean;
  bulk_delete: boolean;
  all_stores: boolean;
};

export const NO_BULK_PERMISSIONS: ProductBulkPermissions = {
  export: false,
  import: false,
  bulk_edit: false,
  bulk_edit_pricing: false,
  bulk_delete: false,
  all_stores: false,
};

export type ProductImportRow = {
  row: number;
  handle: string | null;
  title: string | null;
  action: "create" | "update" | "skip" | "error";
  errors: string[];
  warnings: string[];
  product_id?: string;
};

export type ProductImportResult = {
  message: string;
  dry_run: boolean;
  mode: "upsert" | "create" | "update";
  columns: string[];
  ignored_columns: string[];
  summary: { total: number; create: number; update: number; skip: number; error: number };
  rows: ProductImportRow[];
};

export type ProductBulkResult = {
  message: string;
  updated: number;
  skipped: Array<{ id: string; name: string; reason: string }>;
};

export const PRODUCT_CREATE_STATUSES = ["draft", "active"] as const;

export function productStatusLabel(status: ProductStatus): string {
  if (status === "active") return "publish";
  return status;
}

export function slugifyClient(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 270);
}

/** Build all option combinations for variant rows. */
export function cartesianVariants(
  options: Array<{ name: string; values: string[] }>,
): Array<{ title: string; option_values: Record<string, string> }> {
  const usable = options.filter(
    (o) => o.name.trim() && o.values.some((v) => v.trim()),
  );
  if (usable.length === 0) return [];

  const combos = usable.reduce<Array<Record<string, string>>>(
    (acc, opt) => {
      const values = opt.values.map((v) => v.trim()).filter(Boolean);
      const next: Array<Record<string, string>> = [];
      for (const row of acc) {
        for (const value of values) {
          next.push({ ...row, [opt.name.trim()]: value });
        }
      }
      return next;
    },
    [{}],
  );

  return combos.map((option_values) => ({
    title: Object.values(option_values).join(" / "),
    option_values,
  }));
}
