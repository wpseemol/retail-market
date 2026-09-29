"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch, ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/money";

type CustomerOrder = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total: string;
  placed_at: string;
  claimed_at: string | null;
  item_count: number;
  items: Array<{ id: string; product_name: string; quantity: number; line_total: string }>;
};

type OrdersResponse = {
  orders: CustomerOrder[];
  pagination: { page: number; total_pages: number; total: number };
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  confirmed: "bg-info/10 text-info",
  processing: "bg-info/10 text-info",
  shipped: "bg-info/10 text-info",
  delivered: "bg-brand-primary/10 text-brand-primary",
  cancelled: "bg-error/10 text-error",
  refunded: "bg-error/10 text-error",
};

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch<OrdersResponse>(`/api/customer/orders?page=${page}&limit=10`)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Could not load orders");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  const orders = data?.orders ?? [];

  return (
    <main className="flex-1 bg-bg-base">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mx-auto max-w-3xl rounded-2xl border border-border-default bg-bg-surface p-6 sm:p-8"
        >
          <h1 className="relative inline-block text-xl sm:text-2xl font-semibold text-text-primary pb-2">
            My orders
            <span className="absolute bottom-0 left-0 w-7 h-0.5 bg-brand-primary" />
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            Orders placed while signed in, plus guest orders linked after you{" "}
            <Link href="/account" className="font-medium text-brand-primary hover:underline">
              verify your email or mobile
            </Link>
            .
          </p>

          {loading && !data ? (
            <div className="mt-8 flex flex-col gap-3" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-bg-subtle" />
              ))}
            </div>
          ) : error ? (
            <p className="mt-8 text-sm text-error" role="alert">
              {error}
            </p>
          ) : orders.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-border-default bg-bg-subtle/40 px-5 py-10 text-center">
              <p className="text-sm font-medium text-text-primary">No orders yet</p>
              <p className="mt-1 text-sm text-text-secondary">
                Ordered as a guest? Verify the same email or mobile on your account page and the
                order will appear here.
              </p>
              <Link
                href="/shop"
                className="mt-5 inline-flex h-10 items-center rounded-md bg-brand-primary px-5 text-sm font-semibold text-white hover:bg-brand-hover transition-colors"
              >
                Start shopping
              </Link>
            </div>
          ) : (
            <ul className="mt-8 flex list-none flex-col gap-3 p-0">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="rounded-xl border border-border-default bg-bg-base p-4 sm:p-5 transition-colors hover:border-brand-primary/50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="m-0 text-[15px] font-semibold text-text-primary">
                        {order.order_number}
                      </p>
                      <p className="m-0 mt-0.5 text-[12.5px] text-text-secondary">
                        {new Date(order.placed_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        · {order.item_count} item{order.item_count === 1 ? "" : "s"}
                        {order.claimed_at ? " · linked from guest checkout" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                          STATUS_STYLES[order.status] ?? "bg-bg-subtle text-text-secondary"
                        }`}
                      >
                        {order.status}
                      </span>
                      <span className="text-[15px] font-bold text-brand-primary tabular-nums">
                        {formatPrice(Number(order.total))}
                      </span>
                    </div>
                  </div>
                  <p className="m-0 mt-3 line-clamp-1 text-[13px] text-text-secondary">
                    {order.items.map((i) => `${i.product_name} × ${i.quantity}`).join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {data && data.pagination.total_pages > 1 ? (
            <div className="mt-6 flex items-center justify-between text-sm">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => {
                  setLoading(true);
                  setPage((p) => p - 1);
                }}
                className="h-9 rounded-md border border-border-default px-4 font-medium text-text-primary disabled:opacity-50 cursor-pointer"
              >
                Previous
              </button>
              <span className="text-text-secondary">
                Page {data.pagination.page} of {data.pagination.total_pages}
              </span>
              <button
                type="button"
                disabled={page >= data.pagination.total_pages || loading}
                onClick={() => {
                  setLoading(true);
                  setPage((p) => p + 1);
                }}
                className="h-9 rounded-md border border-border-default px-4 font-medium text-text-primary disabled:opacity-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          ) : null}
        </motion.section>
      </div>
    </main>
  );
}
