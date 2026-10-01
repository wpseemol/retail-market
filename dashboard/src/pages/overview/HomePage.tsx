import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
    AlertTriangle,
    ArrowRight,
    Banknote,
    ClipboardList,
    ExternalLink,
    Globe2,
    MessageSquareText,
    MousePointerClick,
    Package,
    PackageX,
    RefreshCw,
    ShoppingBag,
    Store,
    UserPlus,
    Users,
} from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    OrderStatusPill,
    PaymentStatusBadge,
} from "@/components/orders/OrderBadges";
import {
    CategorySalesChart,
    ChangeBadge,
    DeviceChart,
    KpiCard,
    OrderStatusChart,
    PaymentMethodChart,
    TrendChart,
} from "@/components/overview/OverviewCharts";
import { formatBdt, formatPlacedAt } from "@/lib/orders";
import {
    NON_GEO_COUNTRIES,
    OVERVIEW_RANGES,
    formatBdtCompact,
    formatCompact,
    type OverviewData,
    type OverviewRange,
} from "@/lib/overview";
import { STOREFRONT_URL } from "@/lib/seo";
import { cn } from "@/lib/utils";

const WorldMap = lazy(() => import("@/components/overview/WorldMap"));

function parseRange(v: string | null): OverviewRange {
    const n = Number(v);
    return (OVERVIEW_RANGES as readonly number[]).includes(n)
        ? (n as OverviewRange)
        : 30;
}

export function HomePage() {
    const token = useAuthStore((s) => s.token);
    const role = useAuthStore((s) => s.user?.role);
    const isSuperAdmin = role === "super_admin";
    const [params, setParams] = useSearchParams();
    const range = parseRange(params.get("range"));
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        apiFetch<{ overview: OverviewData }>(
            `/api/dashboard/overview?range=${range}`,
            { token },
        )
            .then((data) => {
                if (cancelled) return;
                setOverview(data.overview);
                setUpdatedAt(new Date());
            })
            .catch((err) => {
                if (!cancelled)
                    setError(
                        err instanceof ApiError
                            ? err.message
                            : "Failed to load overview",
                    );
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [token, range, refreshKey]);

    const setRange = useCallback(
        (next: OverviewRange) => {
            setParams((prev) => {
                const p = new URLSearchParams(prev);
                if (next === 30) p.delete("range");
                else p.set("range", String(next));
                return p;
            });
        },
        [setParams],
    );

    const k = overview?.kpis;
    const series = overview?.timeseries ?? [];
    const busy = loading && !overview;

    const kpis = [
        {
            title: "Revenue",
            value: k ? formatBdtCompact(k.current.revenue) : "—",
            previous: k ? formatBdtCompact(k.previous.revenue) : "—",
            change: k?.change.revenue ?? null,
            icon: Banknote,
            dataKey: "revenue" as const,
            color: "var(--chart-1)",
        },
        {
            title: "Orders",
            value: k ? k.current.orders.toLocaleString() : "—",
            previous: k ? k.previous.orders.toLocaleString() : "—",
            change: k?.change.orders ?? null,
            icon: ShoppingBag,
            dataKey: "orders" as const,
            color: "var(--chart-2)",
        },
        {
            title: "Visitors",
            value: k ? formatCompact(k.current.visitors) : "—",
            previous: k ? formatCompact(k.previous.visitors) : "—",
            change: k?.change.visitors ?? null,
            icon: Users,
            dataKey: "visitors" as const,
            color: "var(--chart-4)",
        },
        {
            title: "Page views",
            value: k ? formatCompact(k.current.page_views) : "—",
            previous: k ? formatCompact(k.previous.page_views) : "—",
            change: k?.change.page_views ?? null,
            icon: MousePointerClick,
            dataKey: "page_views" as const,
            color: "var(--chart-3)",
        },
    ];

    const stats = overview?.stats;
    const geoCountries = (overview?.visitors_by_country ?? []).filter(
        (c) => !NON_GEO_COUNTRIES.has(c.country),
    );
    const nonGeoVisits = (overview?.visitors_by_country ?? [])
        .filter((c) => NON_GEO_COUNTRIES.has(c.country))
        .reduce((n, c) => n + c.visits, 0);
    const allCountries = overview?.visitors_by_country ?? [];
    const maxCountry = Math.max(1, ...allCountries.map((c) => c.visits));

    const alerts = stats
        ? [
              {
                  count: stats.pending_orders,
                  label: "pending orders",
                  hint: "waiting for confirmation",
                  to: "/orders",
                  icon: ClipboardList,
              },
              {
                  count: stats.pending_reviews,
                  label: "reviews to moderate",
                  hint: "customers are waiting",
                  to: "/support/reviews",
                  icon: MessageSquareText,
              },
              {
                  count: stats.low_stock,
                  label: "products low on stock",
                  hint: "restock soon",
                  to: "/products",
                  icon: PackageX,
              },
          ].filter((a) => a.count > 0)
        : [];

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                        Overview
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Sales, traffic and catalog health for the last {range}{" "}
                        days
                        {updatedAt
                            ? ` · updated ${updatedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                            : ""}
                        .
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div
                        role="tablist"
                        aria-label="Date range"
                        className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5"
                    >
                        {OVERVIEW_RANGES.map((r) => (
                            <button
                                key={r}
                                type="button"
                                role="tab"
                                aria-selected={range === r}
                                onClick={() => setRange(r)}
                                className={cn(
                                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                                    range === r
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                {r} days
                            </button>
                        ))}
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => setRefreshKey((n) => n + 1)}
                        disabled={loading}
                        aria-label="Refresh"
                        title="Refresh"
                    >
                        <RefreshCw
                            className={cn(
                                "size-3.5",
                                loading && "animate-spin",
                            )}
                        />
                    </Button>
                </div>
            </div>

            {error ? (
                <div
                    role="alert"
                    className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                >
                    {error}
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setRefreshKey((n) => n + 1)}
                    >
                        Try again
                    </Button>
                </div>
            ) : null}

            {alerts.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {alerts.map((a) => (
                        <Link
                            key={a.label}
                            to={a.to}
                            className="group flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 transition-colors hover:bg-amber-500/10"
                        >
                            <span className="flex size-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                <a.icon className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold">
                                    {a.count.toLocaleString()} {a.label}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                    {a.hint}
                                </span>
                            </span>
                            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </Link>
                    ))}
                </div>
            ) : null}

            <div
                className={cn(
                    "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
                    loading && overview && "opacity-70 transition-opacity",
                )}
            >
                {kpis.map((kpi) => (
                    <KpiCard
                        key={kpi.title}
                        {...kpi}
                        series={series}
                        loading={busy}
                    />
                ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    {
                        label: "Avg. order value",
                        value: k ? formatBdt(k.current.avg_order_value) : "—",
                        change: k?.change.avg_order_value ?? null,
                        icon: Banknote,
                    },
                    {
                        label: "Conversion rate",
                        value: k ? `${k.current.conversion_rate}%` : "—",
                        change: k?.change.conversion_rate ?? null,
                        icon: MousePointerClick,
                        hint: "Orders ÷ unique visitors",
                    },
                    {
                        label: "New customers",
                        value: k
                            ? k.current.new_customers.toLocaleString()
                            : "—",
                        change: k?.change.new_customers ?? null,
                        icon: UserPlus,
                    },
                    {
                        label: "Customers (all time)",
                        value: stats ? stats.customers.toLocaleString() : "—",
                        change: undefined,
                        icon: Users,
                        hint: stats
                            ? `${stats.sessions_30d.toLocaleString()} sign-ins in 30 days`
                            : undefined,
                    },
                ].map((s) => (
                    <div
                        key={s.label}
                        className="flex items-center gap-3 rounded-xl border border-border/80 bg-card px-4 py-3"
                    >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <s.icon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p
                                className="truncate text-xs text-muted-foreground"
                                title={s.hint}
                            >
                                {s.label}
                            </p>
                            <p className="text-base font-semibold tabular-nums">
                                {busy ? "…" : s.value}
                            </p>
                        </div>
                        {s.change !== undefined && !busy ? (
                            <ChangeBadge value={s.change} />
                        ) : null}
                    </div>
                ))}
            </div>

            {overview ? (
                <TrendChart data={overview} />
            ) : (
                <div className="h-95 animate-pulse rounded-xl bg-muted/50" />
            )}

            {overview ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <OrderStatusChart data={overview} />
                    <PaymentMethodChart data={overview} />
                    <DeviceChart data={overview} />
                </div>
            ) : null}

            <Card className="border-border/80">
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Globe2 className="size-4 text-brand-primary" />
                            Visitors around the world
                        </CardTitle>
                        <CardDescription>
                            {overview?.source === "sessions"
                                ? "No storefront page visits yet, so this shows dashboard / customer sign-ins by country."
                                : `Storefront page views by country · last ${range} days. Hover a country for details.`}
                        </CardDescription>
                    </div>
                    {overview ? (
                        <Badge variant="outline" className="gap-1">
                            {geoCountries.length}{" "}
                            {geoCountries.length === 1
                                ? "country"
                                : "countries"}
                        </Badge>
                    ) : null}
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
                    <div>
                        <Suspense
                            fallback={
                                <div className="aspect-960/470 w-full animate-pulse rounded-xl bg-muted/50" />
                            }
                        >
                            <WorldMap countries={geoCountries} />
                        </Suspense>
                        {nonGeoVisits > 0 ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                                {nonGeoVisits.toLocaleString()} visits from a
                                local network or unknown location are not shown
                                on the map.
                            </p>
                        ) : null}
                    </div>
                    <div className="space-y-3">
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            Top countries
                        </p>
                        {busy ? (
                            <p className="py-6 text-sm text-muted-foreground">
                                Loading…
                            </p>
                        ) : allCountries.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                                No visitor data yet. Open the storefront to
                                start collecting visits.
                            </div>
                        ) : (
                            <ul className="max-h-75 space-y-3 overflow-y-auto pr-1">
                                {allCountries.slice(0, 12).map((row) => (
                                    <li
                                        key={row.country}
                                        className="space-y-1.5"
                                    >
                                        <div className="flex items-center justify-between gap-2 text-sm">
                                            <span className="flex min-w-0 items-center gap-2">
                                                <span
                                                    className="text-base leading-none"
                                                    aria-hidden
                                                >
                                                    {row.flag}
                                                </span>
                                                <span className="truncate font-medium">
                                                    {row.country_name}
                                                </span>
                                            </span>
                                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                                {row.visits.toLocaleString()} ·{" "}
                                                {row.percent}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full",
                                                    NON_GEO_COUNTRIES.has(
                                                        row.country,
                                                    )
                                                        ? "bg-muted-foreground/40"
                                                        : "bg-brand-primary",
                                                )}
                                                style={{
                                                    width: `${Math.max(3, (row.visits / maxCountry) * 100)}%`,
                                                }}
                                            />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </CardContent>
            </Card>

            {overview ? (
                <div className="grid gap-4 lg:grid-cols-2">
                    <CategorySalesChart data={overview} />
                    <Card className="border-border/80">
                        <CardHeader>
                            <CardTitle className="text-base">
                                Best-selling products
                            </CardTitle>
                            <CardDescription>
                                By revenue · last {range} days
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {overview.top_products.length === 0 ? (
                                <p className="py-10 text-center text-sm text-muted-foreground">
                                    No sales in this period.
                                </p>
                            ) : (
                                <ol className="space-y-3">
                                    {overview.top_products.map((p, i) => {
                                        const top =
                                            overview.top_products[0]?.revenue ||
                                            1;
                                        return (
                                            <li
                                                key={`${p.product_id}-${p.name}`}
                                                className="flex items-center gap-3"
                                            >
                                                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold tabular-nums">
                                                    {i + 1}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        {p.product_id ? (
                                                            <Link
                                                                to={`/products/${p.product_id}`}
                                                                className="truncate text-sm font-medium hover:underline"
                                                            >
                                                                {p.name}
                                                            </Link>
                                                        ) : (
                                                            <span className="truncate text-sm font-medium">
                                                                {p.name}
                                                            </span>
                                                        )}
                                                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                                                            {formatBdtCompact(
                                                                p.revenue,
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 flex items-center gap-2">
                                                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                                            <div
                                                                className="h-full rounded-full bg-chart-2"
                                                                style={{
                                                                    width: `${(p.revenue / top) * 100}%`,
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-[11px] tabular-nums text-muted-foreground">
                                                            {p.units} sold
                                                        </span>
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ol>
                            )}
                        </CardContent>
                    </Card>
                </div>
            ) : null}

            {overview ? (
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                    <Card className="border-border/80">
                        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                            <div>
                                <CardTitle className="text-base">
                                    Recent orders
                                </CardTitle>
                                <CardDescription>
                                    The latest orders across all stores
                                </CardDescription>
                            </div>
                            <Button asChild variant="ghost" size="sm">
                                <Link to="/orders">
                                    View all <ArrowRight className="size-3.5" />
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="px-0">
                            {overview.recent_orders.length === 0 ? (
                                <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                                    No orders yet.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border/70 text-left text-xs text-muted-foreground">
                                                <th className="px-6 py-2 font-medium">
                                                    Order
                                                </th>
                                                <th className="px-3 py-2 font-medium">
                                                    Customer
                                                </th>
                                                <th className="px-3 py-2 font-medium">
                                                    Status
                                                </th>
                                                <th className="px-6 py-2 text-right font-medium">
                                                    Total
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {overview.recent_orders.map((o) => {
                                                const placed = formatPlacedAt(
                                                    o.placed_at,
                                                );
                                                return (
                                                    <tr
                                                        key={o.id}
                                                        className="border-b border-border/50 last:border-0 hover:bg-muted/30"
                                                    >
                                                        <td className="px-6 py-2.5">
                                                            <Link
                                                                to={`/orders/${o.id}`}
                                                                className="font-medium hover:underline"
                                                            >
                                                                {o.order_number}
                                                            </Link>
                                                            <p className="text-[11px] text-muted-foreground">
                                                                {placed.date} ·{" "}
                                                                {placed.time} ·{" "}
                                                                {o.items} item
                                                                {o.items === 1
                                                                    ? ""
                                                                    : "s"}
                                                            </p>
                                                        </td>
                                                        <td className="max-w-40 truncate px-3 py-2.5">
                                                            {o.customer}
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                <OrderStatusPill
                                                                    status={
                                                                        o.status
                                                                    }
                                                                />
                                                                <PaymentStatusBadge
                                                                    status={
                                                                        o.payment_status
                                                                    }
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-2.5 text-right font-semibold tabular-nums">
                                                            {formatBdt(
                                                                o.total,
                                                                o.currency,
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="grid gap-4">
                        <Card className="border-border/80">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">
                                    Top pages
                                </CardTitle>
                                <CardDescription>
                                    Most viewed storefront pages
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {overview.top_pages.length === 0 ? (
                                    <p className="py-4 text-sm text-muted-foreground">
                                        No page views yet.
                                    </p>
                                ) : (
                                    <ul className="space-y-2">
                                        {overview.top_pages.map((p) => (
                                            <li
                                                key={p.path}
                                                className="flex items-center justify-between gap-3 text-sm"
                                            >
                                                <a
                                                    href={`${STOREFRONT_URL}${p.path}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="group flex min-w-0 items-center gap-1 truncate font-mono text-xs hover:text-brand-primary"
                                                >
                                                    <span className="truncate">
                                                        {p.path}
                                                    </span>
                                                    <ExternalLink className="size-3 shrink-0 opacity-0 group-hover:opacity-100" />
                                                </a>
                                                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                                    {p.visits.toLocaleString()}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {overview.top_referrers.length > 0 ? (
                                    <div className="mt-4 border-t border-border/60 pt-3">
                                        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            Traffic sources
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {overview.top_referrers.map((r) => (
                                                <span
                                                    key={r.source}
                                                    className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-2.5 py-1 text-xs"
                                                >
                                                    {r.source}
                                                    <span className="tabular-nums text-muted-foreground">
                                                        {formatCompact(
                                                            r.visits,
                                                        )}
                                                    </span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>

                        <Card className="border-border/80">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <AlertTriangle className="size-4 text-amber-500" />
                                    Low stock
                                </CardTitle>
                                <CardDescription>
                                    {overview.stats.low_stock > 0
                                        ? `${overview.stats.low_stock} product${overview.stats.low_stock === 1 ? "" : "s"} at or below the alert level`
                                        : "Every active product is above its alert level"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {overview.low_stock.length === 0 ? (
                                    <p className="rounded-lg bg-emerald-500/5 px-3 py-3 text-xs text-emerald-700 dark:text-emerald-300">
                                        All stocked up.
                                    </p>
                                ) : (
                                    <ul className="space-y-2">
                                        {overview.low_stock.map((p) => (
                                            <li
                                                key={p.id}
                                                className="flex items-center justify-between gap-3 text-sm"
                                            >
                                                <Link
                                                    to={`/products/${p.id}`}
                                                    className="min-w-0 truncate hover:underline"
                                                >
                                                    {p.name}
                                                </Link>
                                                <span
                                                    className={cn(
                                                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                                                        p.stock_qty === 0
                                                            ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                                                            : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
                                                    )}
                                                >
                                                    {p.stock_qty === 0
                                                        ? "Out"
                                                        : `${p.stock_qty} left`}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {(
                    [
                        {
                            to: "/products",
                            title: "Products",
                            value: stats?.products,
                            desc: "In the catalog",
                            icon: Package,
                            show: true,
                        },
                        {
                            to: "/stores",
                            title: "Stores",
                            value: stats?.shops,
                            desc: "Partner stores",
                            icon: Store,
                            show: true,
                        },
                        {
                            to: "/orders",
                            title: "Orders",
                            value: stats?.orders,
                            desc: "All time",
                            icon: ClipboardList,
                            show: true,
                        },
                        {
                            to: "/users",
                            title: "Staff & vendors",
                            value: stats?.staff_users,
                            desc: "Dashboard accounts",
                            icon: Users,
                            show: isSuperAdmin,
                        },
                    ] as const
                )
                    .filter((l) => l.show)
                    .map((l) => (
                        <Link
                            key={l.to}
                            to={l.to}
                            className="group flex items-center gap-3 rounded-xl border border-border/80 bg-linear-to-br from-background to-muted/30 px-4 py-3 transition-shadow hover:shadow-md"
                        >
                            <span className="flex size-9 items-center justify-center rounded-lg bg-brand-tint text-brand-deep">
                                <l.icon className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold">
                                    {l.title}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                    {l.desc}
                                </span>
                            </span>
                            <span className="text-lg font-semibold tabular-nums">
                                {l.value?.toLocaleString() ?? "—"}
                            </span>
                        </Link>
                    ))}
            </div>
        </div>
    );
}
