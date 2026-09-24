import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { countryName, flagEmoji } from "../lib/geo.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";

export const dashboardOverviewRouter = Router();

dashboardOverviewRouter.use(
  requireAuth,
  requireRoles("super_admin", "admin"),
);

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

dashboardOverviewRouter.get("/", async (_req, res) => {
  const since30 = daysAgo(30);
  const since7 = daysAgo(7);

  const [
    products,
    orders,
    staffUsers,
    shops,
    visits30,
    visits7,
    sessions30,
    visitCountries,
    sessionCountries,
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
    prisma.pageVisit.count({ where: { created_at: { gte: since30 } } }),
    prisma.pageVisit.count({ where: { created_at: { gte: since7 } } }),
    prisma.userSession.count({
      where: { created_at: { gte: since30 }, is_revoked: false },
    }),
    prisma.pageVisit.groupBy({
      by: ["country"],
      where: { created_at: { gte: since30 } },
      _count: { _all: true },
      orderBy: { _count: { country: "desc" } },
      take: 12,
    }),
    prisma.userSession.groupBy({
      by: ["country"],
      where: {
        created_at: { gte: since30 },
        country: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { country: "desc" } },
      take: 12,
    }),
  ]);

  // Prefer page visits for visitor geography; fall back to login sessions.
  const rawCountries =
    visitCountries.length > 0
      ? visitCountries.map((row) => ({
          country: row.country || "XX",
          count: row._count._all,
        }))
      : sessionCountries.map((row) => ({
          country: row.country || "XX",
          count: row._count._all,
        }));

  const totalCountryHits = rawCountries.reduce((sum, row) => sum + row.count, 0);
  const visitors_by_country = rawCountries.map((row) => ({
    country: row.country,
    country_name: countryName(row.country),
    flag: flagEmoji(row.country),
    visits: row.count,
    percent:
      totalCountryHits > 0
        ? Math.round((row.count / totalCountryHits) * 1000) / 10
        : 0,
  }));

  return res.json({
    overview: {
      stats: {
        products,
        orders,
        staff_users: staffUsers,
        shops,
        visits_30d: visits30,
        visits_7d: visits7,
        sessions_30d: sessions30,
      },
      visitors_by_country,
      source:
        visitCountries.length > 0
          ? ("page_visits" as const)
          : ("sessions" as const),
      period_days: 30,
    },
  });
});
