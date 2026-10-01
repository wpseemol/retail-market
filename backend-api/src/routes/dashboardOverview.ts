import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { countryName, flagEmoji } from "../lib/geo.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { overviewQuerySchema } from "../validators/overview.js";

export const dashboardOverviewRouter = Router();

dashboardOverviewRouter.use(
  requireAuth,
  requireRoles("super_admin", "admin"),
);

const DAY_MS = 86_400_000;
const LOW_STOCK_DEFAULT = 5;
const LOST_STATUSES = ["cancelled", "refunded"] as const;

function daysAgo(days: number) {
  return new Date(Date.now() - days * DAY_MS);
}

/** UTC midnight `days - 1` days ago, so a 7-day range covers today + the 6 days before. */
function rangeStart(days: number) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d;
}

function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  if (v instanceof Prisma.Decimal) return v.toNumber();
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function dayKey(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function round(n: number, digits = 2) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function change(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return round(((current - previous) / previous) * 100, 1);
}

function referrerHost(raw: string | null): string {
  if (!raw) return "Direct";
  try {
    return new URL(raw).hostname.replace(/^www\./, "") || "Direct";
  } catch {
    return "Other";
  }
}

type DailyOrderRow = { d: Date | string; orders: bigint; revenue: Prisma.Decimal | null };
type DailyVisitRow = { d: Date | string; views: bigint; visitors: bigint };
type CategoryRow = { name: string | null; revenue: Prisma.Decimal | null; units: Prisma.Decimal | bigint | null };
type LowStockRow = { id: bigint; name: string; sku: string | null; stock_qty: number; threshold: bigint | number };

async function periodTotals(from: Date, to: Date) {
  const [orders, sales, visits, visitors, customers] = await Promise.all([
    prisma.order.count({ where: { placed_at: { gte: from, lt: to } } }),
    prisma.order.aggregate({
      where: { placed_at: { gte: from, lt: to }, status: { notIn: [...LOST_STATUSES] } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.pageVisit.count({ where: { created_at: { gte: from, lt: to } } }),
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(DISTINCT ip_hash) AS n FROM page_visits
      WHERE created_at >= ${from} AND created_at < ${to}`,
    prisma.user.count({
      where: { role: "customer", deleted_at: null, created_at: { gte: from, lt: to } },
    }),
  ]);
  const revenue = toNum(sales._sum.total);
  const validOrders = sales._count._all;
  const uniqueVisitors = toNum(visitors[0]?.n);
  return {
    revenue,
    orders,
    avg_order_value: validOrders > 0 ? round(revenue / validOrders) : 0,
    page_views: visits,
    visitors: uniqueVisitors,
    conversion_rate: uniqueVisitors > 0 ? round((validOrders / uniqueVisitors) * 100, 2) : 0,
    new_customers: customers,
  };
}

dashboardOverviewRouter.get("/", async (req, res) => {
  const parsed = overviewQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Invalid range — use 7, 30 or 90",
      errors: parsed.error.flatten().fieldErrors,
    });
  }
  const days = parsed.data.range;
  const now = new Date();
  const from = rangeStart(days);
  const prevFrom = new Date(from.getTime() - days * DAY_MS);
  const since30 = daysAgo(30);
  const since7 = daysAgo(7);

  const [
    products,
    orders,
    staffUsers,
    shops,
    customers,
    visits30,
    visits7,
    sessions30,
    current,
    previous,
    dailyOrders,
    dailyVisits,
    statusRows,
    paymentRows,
    deviceRows,
    pageRows,
    referrerRows,
    visitCountries,
    sessionCountries,
    topProductRows,
    categoryRows,
    lowStockRows,
    lowStockCount,
    productStatusRows,
    pendingOrders,
    pendingReviews,
    recentOrders,
  ] = await Promise.all([
    prisma.product.count({ where: { deleted_at: null } }),
    prisma.order.count(),
    prisma.user.count({
      where: {
        deleted_at: null,
        role: { in: ["super_admin", "admin", "moderator", "vendor"] },
      },
    }),
    prisma.vendor.count({ where: { deleted_at: null } }),
    prisma.user.count({ where: { deleted_at: null, role: "customer" } }),
    prisma.pageVisit.count({ where: { created_at: { gte: since30 } } }),
    prisma.pageVisit.count({ where: { created_at: { gte: since7 } } }),
    prisma.userSession.count({
      where: { created_at: { gte: since30 }, is_revoked: false },
    }),
    periodTotals(from, now),
    periodTotals(prevFrom, from),
    prisma.$queryRaw<DailyOrderRow[]>`
      SELECT DATE(placed_at) AS d, COUNT(*) AS orders,
        SUM(CASE WHEN status IN ('cancelled','refunded') THEN 0 ELSE total END) AS revenue
      FROM orders WHERE placed_at >= ${from}
      GROUP BY DATE(placed_at)`,
    prisma.$queryRaw<DailyVisitRow[]>`
      SELECT DATE(created_at) AS d, COUNT(*) AS views, COUNT(DISTINCT ip_hash) AS visitors
      FROM page_visits WHERE created_at >= ${from}
      GROUP BY DATE(created_at)`,
    prisma.order.groupBy({
      by: ["status"],
      where: { placed_at: { gte: from } },
      _count: { _all: true },
    }),
    prisma.order.groupBy({
      by: ["payment_method"],
      where: { placed_at: { gte: from }, status: { notIn: [...LOST_STATUSES] } },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.pageVisit.groupBy({
      by: ["device_type"],
      where: { created_at: { gte: from } },
      _count: { _all: true },
    }),
    prisma.pageVisit.groupBy({
      by: ["path"],
      where: { created_at: { gte: from } },
      _count: { _all: true },
      orderBy: { _count: { path: "desc" } },
      take: 8,
    }),
    prisma.pageVisit.groupBy({
      by: ["referrer"],
      where: { created_at: { gte: from } },
      _count: { _all: true },
      orderBy: { _count: { referrer: "desc" } },
      take: 200,
    }),
    prisma.pageVisit.groupBy({
      by: ["country"],
      where: { created_at: { gte: from } },
      _count: { _all: true },
      orderBy: { _count: { country: "desc" } },
    }),
    prisma.userSession.groupBy({
      by: ["country"],
      where: { created_at: { gte: from }, country: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { country: "desc" } },
    }),
    prisma.orderItem.groupBy({
      by: ["product_id", "product_name"],
      where: { order: { placed_at: { gte: from }, status: { notIn: [...LOST_STATUSES] } } },
      _sum: { quantity: true, line_total: true },
      orderBy: { _sum: { line_total: "desc" } },
      take: 6,
    }),
    prisma.$queryRaw<CategoryRow[]>`
      SELECT c.name AS name, SUM(oi.line_total) AS revenue, SUM(oi.quantity) AS units
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      LEFT JOIN products p ON p.id = oi.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE o.placed_at >= ${from} AND o.status NOT IN ('cancelled','refunded')
      GROUP BY c.name
      ORDER BY revenue DESC
      LIMIT 7`,
    prisma.$queryRaw<LowStockRow[]>`
      SELECT id, name, sku, stock_qty, COALESCE(low_stock_threshold, ${LOW_STOCK_DEFAULT}) AS threshold
      FROM products
      WHERE deleted_at IS NULL AND status IN ('active','out_of_stock')
        AND stock_qty <= COALESCE(low_stock_threshold, ${LOW_STOCK_DEFAULT})
      ORDER BY stock_qty ASC, name ASC
      LIMIT 6`,
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(*) AS n FROM products
      WHERE deleted_at IS NULL AND status IN ('active','out_of_stock')
        AND stock_qty <= COALESCE(low_stock_threshold, ${LOW_STOCK_DEFAULT})`,
    prisma.product.groupBy({
      by: ["status"],
      where: { deleted_at: null },
      _count: { _all: true },
    }),
    prisma.order.count({ where: { status: "pending" } }),
    prisma.productReview.count({ where: { status: "pending" } }),
    prisma.order.findMany({
      orderBy: { placed_at: "desc" },
      take: 6,
      select: {
        id: true,
        order_number: true,
        status: true,
        payment_status: true,
        total: true,
        currency: true,
        placed_at: true,
        customer_email: true,
        user: { select: { first_name: true, last_name: true } },
        addresses: { where: { type: "shipping" }, select: { full_name: true }, take: 1 },
        _count: { select: { items: true } },
      },
    }),
  ]);

  const ordersByDay = new Map(dailyOrders.map((r) => [dayKey(r.d), r]));
  const visitsByDay = new Map(dailyVisits.map((r) => [dayKey(r.d), r]));
  const timeseries = Array.from({ length: days }, (_, i) => {
    const date = new Date(from.getTime() + i * DAY_MS).toISOString().slice(0, 10);
    const o = ordersByDay.get(date);
    const v = visitsByDay.get(date);
    return {
      date,
      revenue: round(toNum(o?.revenue)),
      orders: toNum(o?.orders),
      page_views: toNum(v?.views),
      visitors: toNum(v?.visitors),
    };
  });

  const useVisits = visitCountries.length > 0;
  const rawCountries = (useVisits ? visitCountries : sessionCountries).map((row) => ({
    country: row.country || "XX",
    count: row._count._all,
  }));
  const totalCountryHits = rawCountries.reduce((sum, row) => sum + row.count, 0);
  const visitors_by_country = rawCountries.map((row) => ({
    country: row.country,
    country_name: countryName(row.country),
    flag: flagEmoji(row.country),
    visits: row.count,
    percent: totalCountryHits > 0 ? round((row.count / totalCountryHits) * 100, 1) : 0,
  }));

  const referrers = new Map<string, number>();
  for (const row of referrerRows) {
    const host = referrerHost(row.referrer);
    referrers.set(host, (referrers.get(host) ?? 0) + row._count._all);
  }

  return res.json({
    overview: {
      period_days: days,
      range: { from: from.toISOString(), to: now.toISOString() },
      source: useVisits ? ("page_visits" as const) : ("sessions" as const),
      stats: {
        products,
        orders,
        staff_users: staffUsers,
        shops,
        customers,
        visits_30d: visits30,
        visits_7d: visits7,
        sessions_30d: sessions30,
        pending_orders: pendingOrders,
        pending_reviews: pendingReviews,
        low_stock: toNum(lowStockCount[0]?.n),
      },
      kpis: {
        current,
        previous,
        change: {
          revenue: change(current.revenue, previous.revenue),
          orders: change(current.orders, previous.orders),
          avg_order_value: change(current.avg_order_value, previous.avg_order_value),
          visitors: change(current.visitors, previous.visitors),
          page_views: change(current.page_views, previous.page_views),
          conversion_rate: change(current.conversion_rate, previous.conversion_rate),
          new_customers: change(current.new_customers, previous.new_customers),
        },
      },
      timeseries,
      orders_by_status: statusRows
        .map((r) => ({ status: r.status, count: r._count._all }))
        .sort((a, b) => b.count - a.count),
      payment_methods: paymentRows
        .map((r) => ({ method: r.payment_method, count: r._count._all, revenue: round(toNum(r._sum.total)) }))
        .sort((a, b) => b.revenue - a.revenue),
      devices: deviceRows
        .map((r) => ({ device: r.device_type, visits: r._count._all }))
        .sort((a, b) => b.visits - a.visits),
      top_pages: pageRows.map((r) => ({ path: r.path, visits: r._count._all })),
      top_referrers: [...referrers.entries()]
        .map(([source, visits]) => ({ source, visits }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 6),
      top_products: topProductRows.map((r) => ({
        product_id: r.product_id ? String(r.product_id) : null,
        name: r.product_name,
        units: toNum(r._sum.quantity),
        revenue: round(toNum(r._sum.line_total)),
      })),
      sales_by_category: categoryRows.map((r) => ({
        category: r.name ?? "Uncategorized",
        revenue: round(toNum(r.revenue)),
        units: toNum(r.units),
      })),
      catalog_status: productStatusRows.map((r) => ({ status: r.status, count: r._count._all })),
      low_stock: lowStockRows.map((r) => ({
        id: String(r.id),
        name: r.name,
        sku: r.sku,
        stock_qty: r.stock_qty,
        threshold: toNum(r.threshold),
      })),
      recent_orders: recentOrders.map((o) => ({
        id: String(o.id),
        order_number: o.order_number,
        status: o.status,
        payment_status: o.payment_status,
        total: toNum(o.total),
        currency: o.currency,
        placed_at: o.placed_at.toISOString(),
        items: o._count.items,
        customer:
          o.addresses[0]?.full_name ||
          [o.user?.first_name, o.user?.last_name].filter(Boolean).join(" ") ||
          o.customer_email ||
          "Guest",
      })),
      visitors_by_country,
    },
  });
});
