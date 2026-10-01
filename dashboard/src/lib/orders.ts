export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded";

export type PaymentChannel = "bkash" | "nagad" | "rocket" | "card" | "other";

export type OrderAddress = {
  type: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postal_code: string;
  country: string;
};

export type OrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  variant_title: string | null;
  unit_price: string;
  quantity: number;
  line_total: string;
  product_slug?: string | null;
  thumbnail?: string | null;
  vendor?: { id: string; shop_name: string; slug: string } | null;
};

export type OrderRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string;
  payment_channel: PaymentChannel | null;
  currency: string;
  subtotal: string;
  shipping_fee: string;
  discount_amount: string;
  tax_amount: string;
  total: string;
  notes: string | null;
  courier_name: string | null;
  tracking_number: string | null;
  placed_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  is_guest: boolean;
  claimed_at: string | null;
  customer: {
    id: string | null;
    name: string;
    email: string | null;
    phone: string | null;
    avatar: string | null;
  };
  billing: OrderAddress | null;
  item_count: number;
  items: OrderItem[];
};

export type OrderPayment = {
  id: string;
  method: string;
  status: PaymentStatus;
  amount: string;
  transaction_id: string | null;
  card_type: string | null;
  paid_at: string | null;
  created_at: string;
};

export type OrderDetail = OrderRow & {
  addresses: OrderAddress[];
  payments: OrderPayment[];
};

export type StatusCounts = Record<OrderStatus, number> & { total: number };

export type OrdersListResponse = {
  orders: OrderRow[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
  summary: StatusCounts;
  status_counts: StatusCounts;
};

export type OrderDetailResponse = {
  order: OrderDetail;
  next_statuses: OrderStatus[];
  message?: string;
};

/** Mirrors the backend transition table (`routes/dashboardOrders.ts`). */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "processing", "shipped", "cancelled"],
  confirmed: ["pending", "processing", "shipped", "cancelled"],
  processing: ["confirmed", "shipped", "cancelled"],
  shipped: ["processing", "delivered", "cancelled"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

export const ORDER_DELETE_ROLES = new Set(["super_admin", "admin"]);

/** Mirrors the API: only pending / cancelled orders with no money taken can be deleted. */
export function orderDeleteBlockReason(order: { status: OrderStatus; payment_status: string }): string | null {
  if (["paid", "partially_refunded", "refunded"].includes(order.payment_status)) {
    return "Paid or refunded orders can't be deleted";
  }
  if (order.status !== "pending" && order.status !== "cancelled") {
    return "Only pending or cancelled orders can be deleted";
  }
  return null;
}

export const STATUS_META: Record<
  OrderStatus,
  { label: string; pill: string; dot: string }
> = {
  pending: {
    label: "Pending",
    pill: "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/30",
    dot: "bg-amber-500",
  },
  confirmed: {
    label: "Confirmed",
    pill: "bg-sky-50 text-sky-800 ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/30",
    dot: "bg-sky-500",
  },
  processing: {
    label: "Processing",
    pill: "bg-indigo-50 text-indigo-800 ring-indigo-600/20 dark:bg-indigo-400/10 dark:text-indigo-300 dark:ring-indigo-400/30",
    dot: "bg-indigo-500",
  },
  shipped: {
    label: "Shipped",
    pill: "bg-violet-50 text-violet-800 ring-violet-600/20 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/30",
    dot: "bg-violet-500",
  },
  delivered: {
    label: "Delivered",
    pill: "bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/30",
    dot: "bg-emerald-500",
  },
  cancelled: {
    label: "Cancelled",
    pill: "bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/30",
    dot: "bg-rose-500",
  },
  refunded: {
    label: "Refunded",
    pill: "bg-zinc-100 text-zinc-700 ring-zinc-500/20 dark:bg-zinc-400/10 dark:text-zinc-300 dark:ring-zinc-400/30",
    dot: "bg-zinc-500",
  },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; tone: string }> = {
  paid: {
    label: "Paid",
    tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
  },
  pending: {
    label: "Pending",
    tone: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
  },
  failed: {
    label: "Failed",
    tone: "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300",
  },
  refunded: {
    label: "Refunded",
    tone: "bg-zinc-100 text-zinc-700 dark:bg-zinc-400/10 dark:text-zinc-300",
  },
  partially_refunded: {
    label: "Part refunded",
    tone: "bg-zinc-100 text-zinc-700 dark:bg-zinc-400/10 dark:text-zinc-300",
  },
};

const CHANNEL_LABEL: Record<PaymentChannel, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
  card: "Card",
  other: "Online",
};

/** Brand-ish chip colours for the wallet/card used. */
export const CHANNEL_TONE: Record<PaymentChannel | "cod" | "online", string> = {
  bkash: "bg-pink-600 text-white",
  nagad: "bg-orange-500 text-white",
  rocket: "bg-purple-700 text-white",
  card: "bg-slate-700 text-white dark:bg-slate-500",
  other: "bg-teal-600 text-white",
  online: "bg-teal-600/15 text-teal-800 dark:bg-teal-400/15 dark:text-teal-200",
  cod: "bg-muted text-foreground",
};

export function paymentMethodKey(order: Pick<OrderRow, "payment_method" | "payment_channel">) {
  if (order.payment_method === "cash_on_delivery") return "cod" as const;
  return order.payment_channel ?? ("online" as const);
}

export function paymentMethodLabel(order: Pick<OrderRow, "payment_method" | "payment_channel">) {
  if (order.payment_method === "cash_on_delivery") return "Cash on delivery";
  if (order.payment_channel) return CHANNEL_LABEL[order.payment_channel];
  if (order.payment_method === "sslcommerz") return "SSLCOMMERZ";
  return order.payment_method.replaceAll("_", " ");
}

export function paymentMethodShort(order: Pick<OrderRow, "payment_method" | "payment_channel">) {
  return order.payment_method === "cash_on_delivery" ? "COD" : paymentMethodLabel(order);
}

export function formatBdt(amount: string | number, currency = "BDT") {
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n)) return `${currency} ${amount}`;
  const value = n.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency === "BDT" ? `৳${value}` : `${currency} ${value}`;
}

export function formatPlacedAt(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
  };
}

/** +8801712345678 → 01712-345678 (local format staff dial). */
export function formatBdPhone(phone: string | null | undefined) {
  if (!phone) return "—";
  const local = phone.startsWith("+880") ? `0${phone.slice(4)}` : phone;
  return /^01\d{9}$/.test(local) ? `${local.slice(0, 5)}-${local.slice(5)}` : phone;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase();
}

export function formatAddress(a: OrderAddress | null | undefined) {
  if (!a) return [];
  return [
    a.line1,
    a.line2,
    [a.city, a.state].filter(Boolean).join(", ") + (a.postal_code ? ` ${a.postal_code}` : ""),
    a.country === "BD" ? "Bangladesh" : a.country,
  ].filter((line): line is string => Boolean(line && line.trim()));
}
