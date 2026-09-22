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
  name: string;
  slug: string;
  sku?: string | null;
  brand?: string | null;
  description?: string | null;
  short_description?: string | null;
  type: ProductType;
  price: number;
  compare_at_price?: number | null;
  stock_qty: number;
  status: ProductStatus;
  thumbnail?: ProductMedia | null;
  category?: { id: string; name: string; slug: string } | null;
  vendor?: { id: string; shop_name: string; slug: string } | null;
  options?: ProductOption[];
  variants?: ProductVariant[];
};

/** Brand presets — shops can also type a custom brand. */
export const BRAND_PRESETS = ["Unknown", "Handmade"] as const;

export type BrandMode = "unknown" | "handmade" | "custom";

export function brandModeFromValue(brand: string | null | undefined): BrandMode {
  if (!brand || brand === "Unknown") return "unknown";
  if (brand === "Handmade") return "handmade";
  return "custom";
}

export function brandValueFromMode(mode: BrandMode, custom: string): string | null {
  if (mode === "unknown") return "Unknown";
  if (mode === "handmade") return "Handmade";
  const trimmed = custom.trim();
  return trimmed || null;
}

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
