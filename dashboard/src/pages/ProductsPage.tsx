import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ImageIcon, Package, Pencil, Plus, Search } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import {
  productStatusLabel,
  type Product,
} from "@/lib/products";
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ProductsPage() {
  const { token, user } = useAuthStore();
  const isVendor = user?.role === "vendor";

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [searchDraft, setSearchDraft] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: "50" });
        if (q.trim()) params.set("q", q.trim());
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
  }, [token, q]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isVendor
              ? "Add products under your shop — pick a category, brand, and variants if needed."
              : "Manage catalog products across shops. Each product sits under a shop and category."}
          </p>
        </div>
        <Button asChild>
          <Link to="/products/new">
            <Plus />
            Add product
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-md bg-brand-tint text-brand-deep">
            <Package className="size-4" />
          </div>
          <CardTitle>All products</CardTitle>
          <CardDescription>
            {total} product{total === 1 ? "" : "s"}
          </CardDescription>
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

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[56px]">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground">
                      No products yet.{" "}
                      <Link
                        to="/products/new"
                        className="text-brand-primary underline"
                      >
                        Add one
                      </Link>
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        {product.thumbnail?.path ? (
                          <img
                            src={product.thumbnail.path}
                            alt=""
                            className="size-9 rounded-md object-cover"
                          />
                        ) : (
                          <div className="flex size-9 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                            <ImageIcon className="size-4" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.vendor?.shop_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.category?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.brand ?? "—"}
                      </TableCell>
                      <TableCell className="capitalize">
                        {product.type}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {productStatusLabel(product.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="icon">
                          <Link to={`/products/${product.id}`}>
                            <Pencil />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
