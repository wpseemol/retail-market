import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardList, Package } from "lucide-react";
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

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  currency: string;
  total: string;
  placed_at: string;
  customer: { id: string; name: string; email: string };
  item_count: number;
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: string;
    line_total: string;
  }>;
  addresses?: Array<{
    type: string;
    full_name: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string | null;
    postal_code: string;
    country: string;
  }>;
};

function money(currency: string, amount: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${currency} ${amount}`;
  return `${currency} ${n.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function OrdersPage() {
  const token = useAuthStore((s) => s.token);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ orders: OrderRow[] }>(
          "/api/dashboard/orders?limit=50",
          { token },
        );
        if (!cancelled) setOrders(data.orders);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Failed to load orders",
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Customer purchases from the storefront. Open a row for details.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-brand-tint text-brand-deep">
            <ClipboardList className="size-4" />
          </div>
          <CardTitle className="text-base">Recent orders</CardTitle>
          <CardDescription>
            {loading ? "Loading…" : `${orders.length} order(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Loading orders…
            </p>
          ) : orders.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Package className="mx-auto size-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                No orders yet. When a customer checks out, it appears here and
                in the notification bell.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/70">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    to={`/orders/${order.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-muted/30"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold tracking-tight">
                        {order.order_number}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {order.customer.name} · {order.customer.email} ·{" "}
                        {order.item_count} item(s)
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {order.status}
                      </Badge>
                      <span className="text-sm font-semibold tabular-nums">
                        {money(order.currency, order.total)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.token);
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ order: OrderRow }>(
          `/api/dashboard/orders/${id}`,
          { token },
        );
        if (!cancelled) setOrder(data.order);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Failed to load order",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, id]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link to="/orders">
            <ArrowLeft />
            Orders
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {order?.order_number ?? "Order"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading
            ? "Loading…"
            : order
              ? `Placed ${new Date(order.placed_at).toLocaleString()}`
              : "Order details"}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {order ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="text-base">Items</CardTitle>
              <CardDescription>
                {order.item_count} item(s) ·{" "}
                {money(order.currency, order.total)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty {item.quantity} ·{" "}
                      {money(order.currency, item.unit_price)} each
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums">
                    {money(order.currency, item.line_total)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle className="text-base">Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-medium">{order.customer.name}</p>
                <p className="text-muted-foreground">{order.customer.email}</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="outline" className="capitalize">
                    {order.status}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {order.payment_status}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {order.payment_method.replaceAll("_", " ")}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {(order.addresses ?? []).map((addr) => (
              <Card key={addr.type} className="border-border/80">
                <CardHeader>
                  <CardTitle className="text-base capitalize">
                    {addr.type} address
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{addr.full_name}</p>
                  <p>{addr.phone}</p>
                  <p>{addr.line1}</p>
                  {addr.line2 ? <p>{addr.line2}</p> : null}
                  <p>
                    {addr.city}
                    {addr.state ? `, ${addr.state}` : ""} {addr.postal_code}
                  </p>
                  <p>{addr.country}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
