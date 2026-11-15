export type ShopStatus =
  | "active"
  | "inactive"
  | "pending"
  | "suspended"
  | "banned";

export type StorefrontTheme = "classic" | "marketplace" | "showcase";

export type ProductSort =
  | "featured_first"
  | "newest"
  | "price_asc"
  | "price_desc";

export type ShopMedia = {
  id: string;
  path: string;
  file_name: string;
  original_name?: string | null;
  alt_text?: string | null;
};

export type VendorFeePlan = "commission" | "rent" | "both";
export type VendorRentPeriod = "monthly" | "yearly";
export type VendorMemberRole = "owner" | "helper";

export type ShopMember = {
  id: string;
  role: VendorMemberRole;
  user_id: string;
  created_at?: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    username?: string | null;
    role: string;
    status: string;
  };
};

export type Shop = {
  id: string;
  user_id: string;
  logo_id?: string | null;
  banner_id?: string | null;
  shop_name: string;
  shop_name_bn?: string | null;
  slug: string;
  description?: string | null;
  description_bn?: string | null;
  /** Comma-separated public search tags (not owner name). */
  search_tags?: string | null;
  status: ShopStatus;
  storefront_theme?: StorefrontTheme;
  products_per_page?: number;
  featured_products_count?: number;
  show_banned_brands?: boolean;
  product_sort?: ProductSort;
  fee_plan?: VendorFeePlan;
  commission_percent?: number | null;
  rent_amount?: number | null;
  rent_period?: VendorRentPeriod | null;
  created_at?: string;
  updated_at?: string;
  logo?: ShopMedia | null;
  banner?: ShopMedia | null;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    username?: string | null;
    role: string;
    status: string;
  };
  members?: ShopMember[];
};

export type ShopHistoryItem = {
  id: string;
  action: string;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  note?: string | null;
  created_at: string;
  actor: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
};

export const SHOP_STATUSES: ShopStatus[] = [
  "active",
  "inactive",
  "pending",
  "suspended",
  "banned",
];

export const STOREFRONT_THEMES: StorefrontTheme[] = [
  "classic",
  "marketplace",
  "showcase",
];

export const PRODUCT_SORTS: ProductSort[] = [
  "featured_first",
  "newest",
  "price_asc",
  "price_desc",
];

export function storefrontThemeLabel(theme: StorefrontTheme): string {
  if (theme === "marketplace") return "Marketplace";
  if (theme === "showcase") return "Showcase";
  return "Classic";
}

export function productSortLabel(sort: ProductSort): string {
  if (sort === "newest") return "Newest first";
  if (sort === "price_asc") return "Price: low to high";
  if (sort === "price_desc") return "Price: high to low";
  return "Featured first";
}

export const VENDOR_FEE_PLANS: VendorFeePlan[] = ["commission", "rent", "both"];
export const VENDOR_RENT_PERIODS: VendorRentPeriod[] = ["monthly", "yearly"];

export function feePlanLabel(plan: VendorFeePlan): string {
  if (plan === "rent") return "Fixed rent";
  if (plan === "both") return "Commission + rent";
  return "Commission %";
}

export function rentPeriodLabel(period: VendorRentPeriod): string {
  return period === "yearly" ? "Yearly" : "Monthly";
}

/** Create-shop UI: only draft + publish (maps to pending / active in API). */
export type ShopCreateStatus = "draft" | "publish";

export const SHOP_CREATE_STATUSES: ShopCreateStatus[] = ["draft", "publish"];

export function shopCreateStatusToApi(
  status: ShopCreateStatus,
): Extract<ShopStatus, "pending" | "active"> {
  return status === "publish" ? "active" : "pending";
}

export function shopStatusLabel(status: ShopStatus): string {
  if (status === "active") return "publish";
  if (status === "pending") return "draft";
  return status;
}

export function slugifyClient(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}
