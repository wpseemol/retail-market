import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { STATUS_META } from "@/lib/orders";
import {
  DEVICE_LABEL,
  PAYMENT_METHOD_LABEL,
  formatBdtCompact,
  formatCompact,
  formatDay,
  type OverviewData,
  type TimeseriesPoint,
} from "@/lib/overview";
import { cn } from "@/lib/utils";

const PALETTE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];

const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#0ea5e9",
  processing: "#6366f1",
  shipped: "#8b5cf6",
  delivered: "#10b981",
  cancelled: "#f43f5e",
  refunded: "#71717a",
};

export function ChangeBadge({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null) {
    return <span className="rounded-full bg-brand-tint px-1.5 py-0.5 text-[11px] font-medium text-brand-deep">New</span>;
  }
  const up = value > 0;
  const flat = value === 0;
  const good = flat ? null : up !== invert;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
        good === null && "bg-muted text-muted-foreground",
        good === true && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        good === false && "bg-rose-500/10 text-rose-700 dark:text-rose-300",
      )}
    >
      <Icon className="size-3" aria-hidden />
      {Math.abs(value)}%
    </span>
  );
}

/** KPI with value, change vs previous period and a sparkline. */
export function KpiCard({
  title,
  value,
  previous,
  change,
  icon: Icon,
  series,
  dataKey,
  color,
  loading,
}: {
  title: string;
  value: string;
  previous: string;
  change: number | null;
  icon: LucideIcon;
  series: TimeseriesPoint[];
  dataKey: keyof Omit<TimeseriesPoint, "date"> | null;
  color: string;
  loading: boolean;
}) {
  const gradientId = `spark-${title.replace(/\W/g, "")}`;
  return (
    <Card className="gap-0 overflow-hidden border-border/80 py-0">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 px-4 pt-4 pb-1">
        <div className="min-w-0">
          <CardDescription className="text-xs font-medium">{title}</CardDescription>
          <CardTitle className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
            {loading ? <span className="inline-block h-7 w-24 animate-pulse rounded bg-muted" /> : value}
          </CardTitle>
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand-deep">
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {loading ? null : <ChangeBadge value={change} />}
          <span className="truncate">vs {previous} previous period</span>
        </div>
        <div className="-mx-4 mt-2 h-14">
          {dataKey && !loading ? (
            <ChartContainer config={{ [dataKey]: { label: title, color } }} className="aspect-auto h-full w-full">
              <AreaChart data={series} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  dataKey={dataKey}
                  type="monotone"
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ChartContainer>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

type TrendMetric = "revenue" | "orders" | "traffic";

const trendConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  orders: { label: "Orders", color: "var(--chart-2)" },
  page_views: { label: "Page views", color: "var(--chart-2)" },
  visitors: { label: "Visitors", color: "var(--chart-1)" },
} satisfies ChartConfig;

/** Main chart with metric switcher (revenue / orders / traffic). */
export function TrendChart({ data }: { data: OverviewData }) {
  const [metric, setMetric] = useState<TrendMetric>("revenue");
  const { timeseries, period_days: range, kpis } = data;

  const tabs: { key: TrendMetric; label: string; value: string }[] = [
    { key: "revenue", label: "Revenue", value: formatBdtCompact(kpis.current.revenue) },
    { key: "orders", label: "Orders", value: kpis.current.orders.toLocaleString() },
    { key: "traffic", label: "Traffic", value: formatCompact(kpis.current.page_views) },
  ];

  const tickFormatter = (v: string) => formatDay(v, range > 30 ? 31 : range);
  const interval = range <= 7 ? 0 : "preserveStartEnd";

  return (
    <Card className="gap-0 border-border/80 py-0">
      <CardHeader className="flex flex-col items-stretch gap-0 space-y-0 border-b border-border/70 p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-5 py-4">
          <CardTitle className="text-base">Sales & traffic</CardTitle>
          <CardDescription>Daily totals for the last {range} days. Revenue excludes cancelled and refunded orders.</CardDescription>
        </div>
        <div className="flex">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              data-active={metric === t.key}
              onClick={() => setMetric(t.key)}
              className="relative flex flex-1 flex-col justify-center gap-0.5 border-t border-border/70 px-5 py-3 text-left transition-colors even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:border-l sm:px-6"
            >
              <span className="text-xs text-muted-foreground">{t.label}</span>
              <span className="text-lg leading-none font-semibold tabular-nums sm:text-2xl">{t.value}</span>
              {metric === t.key ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-primary" aria-hidden /> : null}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 pb-3 sm:px-5">
        <ChartContainer config={trendConfig} className="aspect-auto h-[280px] w-full">
          {metric === "orders" ? (
            <BarChart data={timeseries} margin={{ left: 0, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} interval={interval} tickFormatter={tickFormatter} />
              <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => formatDay(String(p?.[0]?.payload?.date ?? ""), 7)} />} />
              <Bar dataKey="orders" fill="var(--color-orders)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          ) : (
            <AreaChart data={timeseries} margin={{ left: 0, right: 8 }}>
              <defs>
                {(["revenue", "page_views", "visitors"] as const).map((k) => (
                  <linearGradient key={k} id={`trend-${k}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={`var(--color-${k})`} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={`var(--color-${k})`} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} interval={interval} tickFormatter={tickFormatter} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={metric === "revenue" ? 56 : 36}
                tickFormatter={(v: number) => (metric === "revenue" ? formatBdtCompact(v) : formatCompact(v))}
              />
              <ChartTooltip
                cursor={{ strokeDasharray: "4 4" }}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={(_, p) => formatDay(String(p?.[0]?.payload?.date ?? ""), 7)}
                    formatter={(value, name) => (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="text-muted-foreground">{trendConfig[name as keyof typeof trendConfig]?.label ?? name}</span>
                        <span className="font-mono font-medium tabular-nums">
                          {name === "revenue" ? `৳${Number(value).toLocaleString()}` : Number(value).toLocaleString()}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              {metric === "revenue" ? (
                <Area dataKey="revenue" type="monotone" stroke="var(--color-revenue)" strokeWidth={2} fill="url(#trend-revenue)" />
              ) : (
                <>
                  <Area dataKey="page_views" type="monotone" stroke="var(--color-page_views)" strokeWidth={2} fill="url(#trend-page_views)" />
                  <Area dataKey="visitors" type="monotone" stroke="var(--color-visitors)" strokeWidth={2} fill="url(#trend-visitors)" />
                  <ChartLegend content={<ChartLegendContent />} />
                </>
              )}
            </AreaChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

/** Donut with a total in the middle and a legend list underneath. */
function DonutCard({
  title,
  description,
  rows,
  centerLabel,
  empty,
}: {
  title: string;
  description: string;
  rows: { key: string; label: string; value: number; color: string }[];
  centerLabel: string;
  empty: string;
}) {
  const total = rows.reduce((n, r) => n + r.value, 0);
  const config = useMemo(
    () => Object.fromEntries(rows.map((r) => [r.key, { label: r.label, color: r.color }])) satisfies ChartConfig,
    [rows],
  );
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <EmptyChart text={empty} />
        ) : (
          <>
            <ChartContainer config={config} className="mx-auto aspect-square h-[190px]">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="key" />} />
                <Pie data={rows} dataKey="value" nameKey="key" innerRadius={56} outerRadius={84} paddingAngle={rows.length > 1 ? 2 : 0} strokeWidth={2}>
                  {rows.map((r) => (
                    <Cell key={r.key} fill={r.color} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (!viewBox || !("cx" in viewBox)) return null;
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-semibold">
                            {formatCompact(total)}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 20} className="fill-muted-foreground text-[11px]">
                            {centerLabel}
                          </tspan>
                        </text>
                      );
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="mt-3 grid gap-1.5 text-xs">
              {rows.map((r) => (
                <li key={r.key} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-sm" style={{ background: r.color }} aria-hidden />
                    <span className="truncate">{r.label}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {r.value.toLocaleString()} · {Math.round((r.value / total) * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function OrderStatusChart({ data }: { data: OverviewData }) {
  const rows = data.orders_by_status.map((r) => ({
    key: r.status,
    label: STATUS_META[r.status]?.label ?? r.status,
    value: r.count,
    color: STATUS_COLOR[r.status] ?? "var(--chart-6)",
  }));
  return (
    <DonutCard
      title="Orders by status"
      description={`Orders placed in the last ${data.period_days} days`}
      rows={rows}
      centerLabel="orders"
      empty="No orders in this period."
    />
  );
}

export function DeviceChart({ data }: { data: OverviewData }) {
  const rows = data.devices.map((r, i) => ({
    key: r.device,
    label: DEVICE_LABEL[r.device] ?? r.device,
    value: r.visits,
    color: PALETTE[i % PALETTE.length],
  }));
  return (
    <DonutCard
      title="Devices"
      description="Storefront page views by device"
      rows={rows}
      centerLabel="views"
      empty="No storefront visits in this period."
    />
  );
}

const paymentConfig = { revenue: { label: "Revenue", color: "var(--chart-2)" } } satisfies ChartConfig;

export function PaymentMethodChart({ data }: { data: OverviewData }) {
  const rows = data.payment_methods.map((r) => ({ ...r, label: PAYMENT_METHOD_LABEL[r.method] ?? r.method }));
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-0">
        <CardTitle className="text-base">Payment methods</CardTitle>
        <CardDescription>Revenue by how customers paid</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyChart text="No paid orders in this period." />
        ) : (
          <>
            <ChartContainer config={paymentConfig} className="aspect-auto h-[190px] w-full">
              <BarChart data={rows} margin={{ top: 12, left: 0, right: 4 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval={0} />
                <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => formatBdtCompact(v)} />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(value, _name, item) => (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="text-muted-foreground">{item.payload.count} orders</span>
                          <span className="font-mono font-medium">৳{Number(value).toLocaleString()}</span>
                        </div>
                      )}
                    />
                  }
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={56}>
                  {rows.map((r, i) => (
                    <Cell key={r.method} fill={PALETTE[(i + 1) % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            <ul className="mt-3 grid gap-1.5 text-xs">
              {rows.map((r, i) => (
                <li key={r.method} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 rounded-sm" style={{ background: PALETTE[(i + 1) % PALETTE.length] }} aria-hidden />
                    {r.label}
                  </span>
                  <span className="tabular-nums text-muted-foreground">{r.count} orders</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const categoryConfig = { revenue: { label: "Revenue", color: "var(--chart-1)" } } satisfies ChartConfig;

export function CategorySalesChart({ data }: { data: OverviewData }) {
  const rows = data.sales_by_category;
  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="text-base">Sales by category</CardTitle>
        <CardDescription>Top categories by revenue · last {data.period_days} days</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyChart text="No sales in this period." />
        ) : (
          <ChartContainer config={categoryConfig} className="aspect-auto w-full" style={{ height: Math.max(160, rows.length * 44) }}>
            <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 56 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" hide />
              <YAxis
                dataKey="category"
                type="category"
                tickLine={false}
                axisLine={false}
                width={150}
                tick={({ x, y, payload }: { x: number | string; y: number | string; payload: { value: string } }) => {
                  const v = String(payload.value);
                  return (
                    <text x={Number(x) - 6} y={Number(y)} dy={4} textAnchor="end" className="fill-muted-foreground text-[11px]">
                      <title>{v}</title>
                      {v.length > 22 ? `${v.slice(0, 21)}…` : v}
                    </text>
                  );
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="text-muted-foreground">{item.payload.units} units</span>
                        <span className="font-mono font-medium">৳{Number(value).toLocaleString()}</span>
                      </div>
                    )}
                  />
                }
              />
              <Bar
                dataKey="revenue"
                fill="var(--color-revenue)"
                radius={[0, 6, 6, 0]}
                maxBarSize={26}
                label={{ position: "right", className: "fill-muted-foreground text-[11px]", formatter: (v: unknown) => formatBdtCompact(Number(v)) }}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
