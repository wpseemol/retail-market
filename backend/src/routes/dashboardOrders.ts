import { Router, type Request, type Response } from "express";
import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { toPublicMedia } from "../lib/user.js";
import { requireAuth, requireRoles, STAFF_ROLES } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  bulkOrderStatusSchema,
  exportOrdersQuerySchema,
  listOrdersQuerySchema,
  ORDER_STATUSES,
  updateOrderStatusSchema,
  updateOrderTrackingSchema,
  type OrderFilters,
  type OrderStatusValue,
} from "../validators/order.js";

export const dashboardOrdersRouter = Router();

dashboardOrdersRouter.use(requireAuth, requireRoles(...STAFF_ROLES));

/** Vendors can read orders that contain their products but never change them (orders can span stores). */
const requireOrderManager = requireRoles("super_admin", "admin", "moderator");

const EXPORT_MAX_ROWS = 5000;

/** Allowed next statuses. Cancelled / refunded are final. */
const NEXT_STATUSES: Record<OrderStatusValue, OrderStatusValue[]> = {
  pending: ["confirmed", "processing", "shipped", "cancelled"],
  confirmed: ["pending", "processing", "shipped", "cancelled"],
  processing: ["confirmed", "shipped", "cancelled"],
  shipped: ["processing", "delivered", "cancelled"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

type Money = { toFixed: (n: number) => string };

function money(value: Money | null | undefined) {
  return value ? value.toFixed(2) : "0.00";
}

const listInclude = {
  user: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      avatar: true,
    },
  },
  items: true,
  addresses: { where: { type: "billing" as const } },
} satisfies Prisma.OrderInclude;

const detailInclude = {
  user: listInclude.user,
  items: {
    include: {
      product: {
        select: {
          slug: true,
          thumbnail: true,
          vendor: { select: { id: true, shop_name: true, slug: true } },
        },
      },
    },
  },
  addresses: true,
  payments: { orderBy: { created_at: "desc" as const }, take: 10 },
} satisfies Prisma.OrderInclude;

type ListRow = Prisma.OrderGetPayload<{ include: typeof listInclude }>;
type DetailRow = Prisma.OrderGetPayload<{ include: typeof detailInclude }>;
type AddressRow = ListRow["addresses"][number];

function publicAddress(a: AddressRow) {
  return {
    type: a.type,
    full_name: a.full_name,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    state: a.state,
    postal_code: a.postal_code,
    country: a.country,
  };
}

function cardTypeOf(payload: Prisma.JsonValue | null) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const validation = (payload as Record<string, unknown>).validation;
  if (!validation || typeof validation !== "object") return null;
  const cardType = (validation as Record<string, unknown>).card_type;
  return typeof cardType === "string" ? cardType : null;
}

function toPublicOrder(order: ListRow | DetailRow) {
  const billing = order.addresses.find((a) => a.type === "billing");
  return {
    id: order.id.toString(),
    order_number: order.order_number,
    status: order.status,
    payment_status: order.payment_status,
    payment_method: order.payment_method,
    payment_channel: order.payment_channel,
    currency: order.currency,
    subtotal: money(order.subtotal),
    shipping_fee: money(order.shipping_fee),
    discount_amount: money(order.discount_amount),
    tax_amount: money(order.tax_amount),
    total: money(order.total),
    notes: order.notes,
    courier_name: order.courier_name,
    tracking_number: order.tracking_number,
    placed_at: order.placed_at.toISOString(),
    shipped_at: order.shipped_at?.toISOString() ?? null,
    delivered_at: order.delivered_at?.toISOString() ?? null,
    cancelled_at: order.cancelled_at?.toISOString() ?? null,
    is_guest: order.user == null,
    claimed_at: order.claimed_at?.toISOString() ?? null,
    customer: {
      id: order.user?.id.toString() ?? null,
      name: order.user
        ? `${order.user.first_name} ${order.user.last_name}`.trim()
        : (billing?.full_name ?? "Guest"),
      email: order.user?.email ?? order.customer_email,
      phone: order.customer_phone ?? billing?.phone ?? null,
      avatar: toPublicMedia(order.user?.avatar)?.path ?? null,
    },
    billing: billing ? publicAddress(billing) : null,
    item_count: order.items.reduce((n, i) => n + i.quantity, 0),
    items: order.items.map((item) => {
      const product = "product" in item ? item.product : null;
      return {
        id: item.id.toString(),
        product_id: item.product_id?.toString() ?? null,
        product_name: item.product_name,
        product_sku: item.product_sku,
        variant_title: item.variant_title,
        unit_price: money(item.unit_price),
        quantity: item.quantity,
        line_total: money(item.line_total),
        ...(product !== null
          ? {
              product_slug: product?.slug ?? null,
              thumbnail: toPublicMedia(product?.thumbnail)?.path ?? null,
              vendor: product?.vendor
                ? {
                    id: product.vendor.id.toString(),
                    shop_name: product.vendor.shop_name,
                    slug: product.vendor.slug,
                  }
                : null,
            }
          : {}),
      };
    }),
  };
}

function toDetailOrder(order: DetailRow) {
  return {
    ...toPublicOrder(order),
    addresses: order.addresses.map(publicAddress),
    payments: order.payments.map((p) => ({
      id: p.id.toString(),
      method: p.method,
      status: p.status,
      amount: money(p.amount),
      transaction_id: p.transaction_id,
      card_type: cardTypeOf(p.provider_payload),
      paid_at: p.paid_at?.toISOString() ?? null,
      created_at: p.created_at.toISOString(),
    })),
  };
}

async function vendorScopedWhere(
  role: string,
  userId: bigint,
): Promise<Prisma.OrderWhereInput | null> {
  if (role !== "vendor") return {};
  const vendor = await prisma.vendor.findFirst({
    where: { user_id: userId, deleted_at: null },
    select: { id: true },
  });
  if (!vendor) return null;
  return {
    items: {
      some: {
        product: { vendor_id: vendor.id },
      },
    },
  };
}

function searchWhere(raw: string | undefined): Prisma.OrderWhereInput {
  const q = raw?.replace(/^#/, "").trim();
  if (!q) return {};
  const or: Prisma.OrderWhereInput[] = [
    { order_number: { contains: q } },
    { customer_email: { contains: q } },
    { addresses: { some: { full_name: { contains: q } } } },
    { user: { first_name: { contains: q } } },
    { user: { last_name: { contains: q } } },
  ];
  // Phones are stored as +8801XXXXXXXXX; accept 01XXX…, 8801XXX… or +8801XXX….
  const digits = q.replace(/[\s()+-]/g, "");
  if (/^\d{3,15}$/.test(digits)) {
    const local = digits.replace(/^880/, "").replace(/^0/, "");
    or.push({ customer_phone: { contains: local } });
    or.push({ addresses: { some: { phone: { contains: local } } } });
  }
  return { OR: or };
}

function paymentWhere(filters: OrderFilters): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};
  if (filters.payment_status && filters.payment_status !== "all") {
    where.payment_status = filters.payment_status;
  }
  const method = filters.payment_method;
  if (method && method !== "all") {
    if (method === "cod") where.payment_method = "cash_on_delivery";
    else if (method === "online") Object.assign(where, { payment_method: "sslcommerz", payment_channel: null });
    else Object.assign(where, { payment_method: "sslcommerz", payment_channel: method });
  }
  return where;
}

function buildWhere(scope: Prisma.OrderWhereInput, filters: OrderFilters, withStatus = true) {
  const and: Prisma.OrderWhereInput[] = [scope, searchWhere(filters.q), paymentWhere(filters)];
  if (withStatus && filters.status.length > 0) and.push({ status: { in: filters.status } });
  return { AND: and } satisfies Prisma.OrderWhereInput;
}

function emptyCounts() {
  return {
    ...(Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatusValue, number>),
    total: 0,
  };
}

async function countByStatus(where: Prisma.OrderWhereInput) {
  const groups = await prisma.order.groupBy({ by: ["status"], where, _count: { _all: true } });
  const counts = emptyCounts();
  for (const g of groups) {
    counts[g.status] = g._count._all;
    counts.total += g._count._all;
  }
  return counts;
}

function validationError(res: Response, error: { flatten: () => { fieldErrors: unknown } }, message = "Validation failed") {
  return res.status(400).json({ message, errors: error.flatten().fieldErrors });
}

function parseOrderId(req: Request) {
  const raw = String(req.params.id ?? "");
  return /^\d{1,19}$/.test(raw) ? BigInt(raw) : null;
}

class StatusChangeError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

type StatusTarget = { id: bigint; status: OrderStatus; payment_method: string; payment_status: string; shipped_at: Date | null };

function statusChangeData(
  order: StatusTarget,
  next: OrderStatusValue,
  shipping?: { courier_name?: string | null; tracking_number?: string | null },
): Prisma.OrderUpdateManyMutationInput {
  if (order.status === next) {
    throw new StatusChangeError("STATUS_UNCHANGED", `Order is already ${next}.`);
  }
  if (!NEXT_STATUSES[order.status].includes(next)) {
    throw new StatusChangeError(
      "INVALID_STATUS_TRANSITION",
      NEXT_STATUSES[order.status].length === 0
        ? `A ${order.status} order can no longer change status.`
        : `Cannot move a ${order.status} order to ${next}.`,
    );
  }

  const now = new Date();
  const data: Prisma.OrderUpdateManyMutationInput = { status: next };
  if (next === "shipped" || next === "delivered") data.shipped_at = order.shipped_at ?? now;
  if (next === "delivered") {
    data.delivered_at = now;
    // Cash is collected by the courier on delivery.
    if (order.payment_method === "cash_on_delivery" && order.payment_status === "pending") {
      data.payment_status = "paid";
    }
  }
  if (next === "cancelled") data.cancelled_at = now;
  if (next === "refunded" && order.payment_status === "paid") data.payment_status = "refunded";
  if (shipping?.courier_name !== undefined) data.courier_name = shipping.courier_name || null;
  if (shipping?.tracking_number !== undefined) data.tracking_number = shipping.tracking_number || null;
  return data;
}

const statusTargetSelect = {
  id: true,
  status: true,
  payment_method: true,
  payment_status: true,
  shipped_at: true,
} as const;

dashboardOrdersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = listOrdersQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error, "Invalid query");

    const { page, limit, ...filters } = parsed.data;
    const scope = await vendorScopedWhere(req.auth!.role, req.auth!.userId);
    if (scope === null) {
      const empty = emptyCounts();
      return res.json({
        orders: [],
        pagination: { page, limit, total: 0, total_pages: 1 },
        summary: empty,
        status_counts: empty,
      });
    }

    const where = buildWhere(scope, filters);
    const [total, rows, summary, statusCounts] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: listInclude,
        orderBy: { placed_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      countByStatus(scope),
      countByStatus(buildWhere(scope, filters, false)),
    ]);

    return res.json({
      orders: rows.map(toPublicOrder),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.max(1, Math.ceil(total / limit)),
      },
      /** All orders the user can see, by status (KPI cards). */
      summary,
      /** Same, but narrowed by the search / payment filters (status tab badges). */
      status_counts: statusCounts,
    });
  }),
);

/** Spreadsheet formulas in a cell (`=`, `+`, `-`, `@`) run when opened in Excel. */
function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const PAYMENT_LABEL: Record<string, string> = {
  cash_on_delivery: "Cash on delivery",
  sslcommerz: "SSLCOMMERZ",
  card: "Card",
  mobile_banking: "Mobile banking",
  bank_transfer: "Bank transfer",
  wallet: "Wallet",
};

dashboardOrdersRouter.get(
  "/export",
  asyncHandler(async (req, res) => {
    const parsed = exportOrdersQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error, "Invalid query");

    const scope = await vendorScopedWhere(req.auth!.role, req.auth!.userId);
    const rows =
      scope === null
        ? []
        : await prisma.order.findMany({
            where: buildWhere(scope, parsed.data),
            include: listInclude,
            orderBy: { placed_at: "desc" },
            take: EXPORT_MAX_ROWS,
          });

    const header = [
      "Order number", "Placed at", "Status", "Customer", "Phone", "Email", "City", "Items",
      "Payment method", "Paid via", "Payment status", "Subtotal", "Delivery fee", "Discount",
      "Total", "Currency", "Courier", "Tracking number",
    ];
    const lines = rows.map((row) => {
      const o = toPublicOrder(row);
      return [
        o.order_number, o.placed_at, o.status, o.customer.name,
        o.customer.phone?.replace(/^\+?880(?=1\d{9}$)/, "0"), o.customer.email,
        o.billing?.city, o.item_count, PAYMENT_LABEL[o.payment_method] ?? o.payment_method,
        o.payment_channel, o.payment_status, o.subtotal, o.shipping_fee, o.discount_amount,
        o.total, o.currency, o.courier_name, o.tracking_number,
      ].map(csvCell).join(",");
    });

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="orders-${stamp}.csv"`);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Total-Rows", String(rows.length));
    // BOM so Excel reads ৳ / Bangla names as UTF-8.
    return res.send(`\uFEFF${[header.join(","), ...lines].join("\r\n")}\r\n`);
  }),
);

dashboardOrdersRouter.post(
  "/bulk-status",
  requireOrderManager,
  asyncHandler(async (req, res) => {
    const parsed = bulkOrderStatusSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);

    const ids = [...new Set(parsed.data.ids)].map((id) => BigInt(id));
    const next = parsed.data.status;
    const orders = await prisma.order.findMany({ where: { id: { in: ids } }, select: { ...statusTargetSelect, order_number: true } });

    const updated: string[] = [];
    const skipped: Array<{ id: string; order_number: string | null; reason: string }> = [];
    for (const id of ids) {
      const order = orders.find((o) => o.id === id);
      if (!order) {
        skipped.push({ id: id.toString(), order_number: null, reason: "Order not found" });
        continue;
      }
      try {
        const data = statusChangeData(order, next);
        // Guard on the old status so a concurrent change isn't overwritten.
        const result = await prisma.order.updateMany({ where: { id, status: order.status }, data });
        if (result.count === 1) updated.push(id.toString());
        else skipped.push({ id: id.toString(), order_number: order.order_number, reason: "Changed by someone else — reload and retry" });
      } catch (err) {
        if (!(err instanceof StatusChangeError)) throw err;
        skipped.push({ id: id.toString(), order_number: order.order_number, reason: err.message });
      }
    }

    return res.json({
      message:
        skipped.length === 0
          ? `${updated.length} order(s) marked ${next}`
          : `${updated.length} updated, ${skipped.length} skipped`,
      updated,
      skipped,
    });
  }),
);

dashboardOrdersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parseOrderId(req);
    if (id === null) return res.status(404).json({ message: "Order not found" });
    const scope = await vendorScopedWhere(req.auth!.role, req.auth!.userId);
    if (scope === null) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = await prisma.order.findFirst({
      where: { id, ...scope },
      include: detailInclude,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.json({
      order: toDetailOrder(order),
      next_statuses: NEXT_STATUSES[order.status],
    });
  }),
);

async function respondWithDetail(res: Response, id: bigint, message: string) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id }, include: detailInclude });
  return res.json({ message, order: toDetailOrder(order), next_statuses: NEXT_STATUSES[order.status] });
}

dashboardOrdersRouter.patch(
  "/:id/status",
  requireOrderManager,
  asyncHandler(async (req, res) => {
    const id = parseOrderId(req);
    if (id === null) return res.status(404).json({ message: "Order not found" });
    const parsed = updateOrderStatusSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);

    const order = await prisma.order.findUnique({ where: { id }, select: statusTargetSelect });
    if (!order) return res.status(404).json({ message: "Order not found" });

    try {
      const data = statusChangeData(order, parsed.data.status, parsed.data);
      const result = await prisma.order.updateMany({
        where: { id, status: order.status },
        data,
      });
      if (result.count === 0) {
        return res.status(409).json({
          message: "This order was changed by someone else. Reload and try again.",
          code: "ORDER_CHANGED",
        });
      }
    } catch (err) {
      if (err instanceof StatusChangeError) {
        return res.status(409).json({ message: err.message, code: err.code });
      }
      throw err;
    }

    return respondWithDetail(res, id, `Order marked ${parsed.data.status}`);
  }),
);

dashboardOrdersRouter.patch(
  "/:id/tracking",
  requireOrderManager,
  asyncHandler(async (req, res) => {
    const id = parseOrderId(req);
    if (id === null) return res.status(404).json({ message: "Order not found" });
    const parsed = updateOrderTrackingSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);

    const exists = await prisma.order.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return res.status(404).json({ message: "Order not found" });

    await prisma.order.update({
      where: { id },
      data: {
        ...(parsed.data.courier_name !== undefined ? { courier_name: parsed.data.courier_name || null } : {}),
        ...(parsed.data.tracking_number !== undefined ? { tracking_number: parsed.data.tracking_number || null } : {}),
      },
    });
    return respondWithDetail(res, id, "Courier details saved");
  }),
);
