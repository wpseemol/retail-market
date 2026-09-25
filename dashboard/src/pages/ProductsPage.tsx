import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ImageIcon,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
} from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import {
  productStatusLabel,
  type Product,
  type ProductStatus,
} from "@/lib/products";
import { useAuthStore } from "@/store/auth";
import { productStatusTone } from "@/components/products/ProductFormShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ProductsPage() {
  const { token, user } = useAuthStore();
  const isVendor = user?.role === "vendor";

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProductStatus>(
    "all",
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: "100" });
        if (q.trim()) params.set("q", q.trim());
        if (statusFilter !== "all") params.set("status", statusFilter);
        const data = await apiFetch<{
          products: Product[];
          pagination: { total: number };
        }>(`/api/dashboard/products?${params.toString()}`, { token });
        if (cancelled) return;
        setProducts(data.products);
        setTotal(data.pagination.total);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "Failed to load products",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token, q, statusFilter]);

  const publishedCount = products.filter((p) => p.status === "active").length;
  const draftCount = products.filter((p) => p.status === "draft").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isVendor
              ? "Add products under your store — category, brand, photos, and variants."
              : "Manage catalog products across stores. Each product sits under a store and category."}
          </p>
        </div>
        <Button asChild>
          <Link to="/products/new">
            <Plus />
            Add product
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-border/80">
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-tint text-brand-deep">
              <Package className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-semibold tabular-nums">{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-tint text-brand-deep">
              <ShoppingBag className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Published (page)</p>
              <p className="text-xl font-semibold tabular-nums">
                {publishedCount}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-tint text-brand-deep">
              <ImageIcon className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Drafts (page)</p>
              <p className="text-xl font-semibold tabular-nums">{draftCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-2 flex size-9 items-center justify-center rounded-md bg-brand-tint text-brand-deep">
                <Package className="size-4" />
              </div>
              <CardTitle>Catalog</CardTitle>
              <CardDescription>
                Browse and edit products across the marketplace
              </CardDescription>
            </div>
            <div className="flex flex-wrap rounded-lg border border-border bg-muted/40 p-0.5">
              {(
                [
                  ["all", "All"],
                  ["active", "Published"],
                  ["draft", "Draft"],
                  ["archived", "Archived"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={
                    statusFilter === key
                      ? "rounded-md bg-background px-3 py-1.5 text-xs font-medium shadow-sm"
                      : "rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setQ(searchDraft.trim());
            }}
          >
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Search name, brand, SKU…"
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Loading products…
            </p>
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">No products yet.</p>
              <Button asChild className="mt-4" size="sm">
                <Link to="/products/new">
                  <Plus />
                  Create first product
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="group flex flex-col gap-3 rounded-xl border border-border bg-gradient-to-br from-background to-muted/30 p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-brand-primary/15 bg-gradient-to-br from-brand-tint to-background text-brand-deep">
                      {product.thumbnail?.path ? (
                        <img
                          src={product.thumbnail.path}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="size-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold tracking-tight">
                            {product.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            /{product.slug}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={productStatusTone(product.status)}
                        >
                          {productStatusLabel(product.status)}
                        </Badge>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                        {[
                          product.vendor?.shop_name,
                          product.category?.name,
                          product.brand_name ?? product.brand?.name,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "No placement yet"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-border/70 pt-3">
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{product.type}</span>
                      <span className="tabular-nums">
                        {product.price.toLocaleString()}
                      </span>
                      <span className="tabular-nums">
                        stock {product.stock_qty}
                      </span>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/products/${product.id}`}>
                        <Pencil />
                        Edit
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
