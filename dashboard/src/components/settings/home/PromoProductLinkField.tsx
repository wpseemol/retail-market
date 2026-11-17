"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import type { Product } from "@/lib/products";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STOREFRONT_URL = (
  (import.meta.env.VITE_STOREFRONT_URL as string | undefined) ??
  "http://localhost:3000"
).replace(/\/$/, "");

type Props = {
  token: string;
  value: string;
  disabled?: boolean;
  onChange: (href: string) => void;
  /** Optional: fill slide image + alt from the picked product. */
  onProductPicked?: (product: {
    href: string;
    name: string;
    image: string | null;
    priceLabel: string | null;
  }) => void;
};

type ListResponse = {
  products: Product[];
};

function productHref(slug: string) {
  return `/shop/${slug}`;
}

function formatPrice(price: number) {
  if (!Number.isFinite(price)) return null;
  return `৳${Math.round(price).toLocaleString("en-BD")}`;
}

/** Search catalog products and set CTA to `/shop/{slug}`. */
export function PromoProductLinkField({
  token,
  value,
  disabled,
  onChange,
  onProductPicked,
}: Props) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setHits([]);
      setError(null);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      setLoading(true);
      apiFetch<ListResponse>(
        `/api/dashboard/products?q=${encodeURIComponent(query)}&limit=8&status=active`,
        { token },
      )
        .then((data) => {
          if (!cancelled) {
            setHits(data.products ?? []);
            setError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setHits([]);
            setError(err instanceof ApiError ? err.message : "Search failed");
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [q, token]);

  function pick(product: Product) {
    const href = productHref(product.slug);
    onChange(href);
    onProductPicked?.({
      href,
      name: product.name,
      image: product.thumbnail?.path ?? null,
      priceLabel: formatPrice(product.price),
    });
    setQ("");
    setHits([]);
  }

  return (
    <div className="space-y-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="/shop/your-product-slug"
        autoComplete="off"
      />
      <div className="relative">
        <Search className="pointer-events-none absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={disabled}
          placeholder="Search products to fill this link…"
          className="pl-8"
          autoComplete="off"
        />
      </div>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="text-xs text-muted-foreground">Searching…</p>
      ) : null}
      {hits.length > 0 ? (
        <ul className="max-h-48 overflow-auto rounded-lg border border-border bg-background p-1 shadow-sm">
          {hits.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => pick(p)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                  "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                )}
              >
                <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  /shop/{p.slug}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {value.startsWith("/") && !value.startsWith("//") ? (
        <a
          href={`${STOREFRONT_URL}${value}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex text-xs font-medium text-brand-primary hover:underline"
        >
          Open on storefront
        </a>
      ) : null}
    </div>
  );
}
