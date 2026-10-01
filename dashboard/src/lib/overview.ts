import type { OrderStatus, PaymentStatus } from "@/lib/orders";

export const OVERVIEW_RANGES = [7, 30, 90] as const;
export type OverviewRange = (typeof OVERVIEW_RANGES)[number];

export type CountryRow = {
  country: string;
  country_name: string;
  flag: string;
  visits: number;
  percent: number;
};

export type PeriodTotals = {
  revenue: number;
  orders: number;
  avg_order_value: number;
  page_views: number;
  visitors: number;
  conversion_rate: number;
  new_customers: number;
};

export type KpiKey = keyof PeriodTotals;

export type TimeseriesPoint = {
  date: string;
  revenue: number;
  orders: number;
  page_views: number;
  visitors: number;
};

export type DeviceType = "desktop" | "mobile" | "tablet" | "unknown";

export type OverviewData = {
  period_days: OverviewRange;
  range: { from: string; to: string };
  source: "page_visits" | "sessions";
  stats: {
    products: number;
    orders: number;
    staff_users: number;
    shops: number;
    customers: number;
    visits_30d: number;
    visits_7d: number;
    sessions_30d: number;
    pending_orders: number;
    pending_reviews: number;
    low_stock: number;
  };
  kpis: {
    current: PeriodTotals;
    previous: PeriodTotals;
    change: Record<KpiKey, number | null>;
  };
  timeseries: TimeseriesPoint[];
  orders_by_status: { status: OrderStatus; count: number }[];
  payment_methods: { method: string; count: number; revenue: number }[];
  devices: { device: DeviceType; visits: number }[];
  top_pages: { path: string; visits: number }[];
  top_referrers: { source: string; visits: number }[];
  top_products: { product_id: string | null; name: string; units: number; revenue: number }[];
  sales_by_category: { category: string; revenue: number; units: number }[];
  catalog_status: { status: string; count: number }[];
  low_stock: { id: string; name: string; sku: string | null; stock_qty: number; threshold: number }[];
  recent_orders: {
    id: string;
    order_number: string;
    status: OrderStatus;
    payment_status: PaymentStatus;
    total: number;
    currency: string;
    placed_at: string;
    items: number;
    customer: string;
  }[];
  visitors_by_country: CountryRow[];
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash_on_delivery: "Cash on delivery",
  sslcommerz: "SSLCOMMERZ",
  card: "Card",
  mobile_banking: "Mobile banking",
  bank_transfer: "Bank transfer",
  wallet: "Wallet",
};

export const DEVICE_LABEL: Record<DeviceType, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  unknown: "Other",
};

/** Codes the API uses for traffic that can't be placed on a map. */
export const NON_GEO_COUNTRIES = new Set(["LO", "XX"]);

/** ৳1.2K / ৳3.4M — for axes and KPI cards. */
export function formatBdtCompact(n: number) {
  return `৳${new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n)}`;
}

export function formatCompact(n: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatDay(iso: string, range: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    ...(range <= 7 ? { weekday: "short" } : {}),
  });
}
