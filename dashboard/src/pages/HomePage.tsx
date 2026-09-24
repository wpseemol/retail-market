import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  Globe2,
  Package,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CountryRow = {
  country: string;
  country_name: string;
  flag: string;
  visits: number;
  percent: number;
};

type OverviewData = {
  stats: {
    products: number;
    orders: number;
    staff_users: number;
    shops: number;
    visits_30d: number;
    visits_7d: number;
    sessions_30d: number;
  };
  visitors_by_country: CountryRow[];
  source: "page_visits" | "sessions";
  period_days: number;
};

export function HomePage() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role);
  const isSuperAdmin = role === "super_admin";
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ overview: OverviewData }>(
          "/api/dashboard/overview",
          { token },
        );
        if (!cancelled) setOverview(data.overview);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Failed to load overview",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const stats = overview?.stats;
  const countries = overview?.visitors_by_country ?? [];
  const maxVisits = Math.max(...countries.map((c) => c.visits), 1);

  const cards = [
    {
      title: "Orders",
      value: stats?.orders ?? "—",
      hint: "All time",
      icon: ClipboardList,
    },
    {
      title: "Products",
      value: stats?.products ?? "—",
      hint: "Active catalog",
      icon: Package,
    },
    {
      title: "Staff & vendors",
      value: stats?.staff_users ?? "—",
      hint: "Dashboard accounts",
      icon: Users,
    },
    {
      title: "Shops",
      value: stats?.shops ?? "—",
      hint: "Partner stores",
      icon: Store,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live catalog metrics and storefront visitors by country
            {overview ? ` · last ${overview.period_days} days` : ""}.
          </p>
        </div>
        {overview ? (
          <Badge variant="outline" className="capitalize">
            <Globe2 className="size-3" />
            {overview.source === "page_visits"
              ? "Page visits"
              : "Login sessions"}
          </Badge>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="border-border/80">
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
              <div>
                <CardDescription>{card.title}</CardDescription>
                <CardTitle className="mt-1 text-2xl font-semibold tabular-nums">
                  {loading ? "…" : Number(card.value).toLocaleString()}
                </CardTitle>
              </div>
              <div className="flex size-9 items-center justify-center rounded-lg bg-brand-tint text-brand-deep">
                <card.icon className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{card.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="border-border/80">
          <CardHeader>
            <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-brand-tint text-brand-deep">
              <Globe2 className="size-4" />
            </div>
            <CardTitle className="text-base">Visitors by country</CardTitle>
            <CardDescription>
              Where storefront visitors come from
              {stats
                ? ` · ${stats.visits_30d.toLocaleString()} visits (30d) · ${stats.visits_7d.toLocaleString()} (7d)`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading visitor data…
              </p>
            ) : countries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  No visitor data yet. Open the storefront to start collecting
                  country visits.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Local development shows as “Local network”.
                </p>
              </div>
            ) : (
              countries.map((row) => (
                <div key={row.country} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="text-base leading-none" aria-hidden>
                        {row.flag}
                      </span>
                      <span className="truncate font-medium">
                        {row.country_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {row.country}
                      </span>
                    </div>
                    <div className="shrink-0 tabular-nums text-xs text-muted-foreground">
                      {row.visits.toLocaleString()} · {row.percent}%
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-brand-primary transition-[width]"
                      style={{
                        width: `${Math.max(4, (row.visits / maxVisits) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-brand-tint text-brand-deep">
              <TrendingUp className="size-4" />
            </div>
            <CardTitle className="text-base">Quick links</CardTitle>
            <CardDescription>
              Jump into the areas you manage most often.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {(
              [
                ["/products", "Products", "Catalog listings", true],
                ["/shops", "Shops", "Partner stores", true],
                ["/users", "Users", "Staff accounts", isSuperAdmin],
                ["/settings", "Site settings", "SEO & pixels", isSuperAdmin],
              ] as const
            )
              .filter((row) => row[3])
              .map(([to, title, desc]) => (
              <Link
                key={to}
                to={to}
                className="rounded-xl border border-border/80 bg-gradient-to-br from-background to-muted/30 px-4 py-3 transition-shadow hover:shadow-md"
              >
                <p className="text-sm font-semibold tracking-tight">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </Link>
            ))}
            {stats ? (
              <div className="mt-2 rounded-xl border border-brand-primary/15 bg-brand-tint/40 px-4 py-3 text-xs text-brand-deep">
                <p className="font-medium">Sessions (30d)</p>
                <p className="mt-0.5 tabular-nums text-lg font-semibold">
                  {stats.sessions_30d.toLocaleString()}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
