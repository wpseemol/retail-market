import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Pencil, Plus, Search, Store } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import type { Shop } from "@/lib/shops";
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

export function ShopsPage() {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const isSuper = user?.role === "super_admin";
  const isVendor = user?.role === "vendor";

  const [shops, setShops] = useState<Shop[]>([]);
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
        // Vendor: if they have no shop yet, send them to create.
        if (isVendor && !isSuper) {
          const me = await apiFetch<{ shop: Shop | null }>(
            "/api/dashboard/shops/me",
            { token },
          );
          if (cancelled) return;
          if (!me.shop) {
            navigate("/shops/new", { replace: true });
            return;
          }
        }

        const params = new URLSearchParams({ limit: "50" });
        if (q.trim()) params.set("q", q.trim());
        const data = await apiFetch<{
          shops: Shop[];
          pagination: { total: number };
        }>(`/api/dashboard/shops?${params.toString()}`, { token });
        if (cancelled) return;
        setShops(data.shops);
        setTotal(data.pagination.total);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Failed to load shops");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token, q, isVendor, isSuper, navigate]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shops</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSuper
              ? "Create and edit every vendor shop — name, slug, status, and owner."
              : "Manage your shop name and unique slug."}
          </p>
        </div>
        <Button asChild>
          <Link to="/shops/new">
            <Plus />
            Create shop
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-brand-tint text-brand-deep">
              <Store className="size-4" />
            </div>
            <div>
              <CardTitle>All shops</CardTitle>
              <CardDescription>
                {total} shop{total === 1 ? "" : "s"}
              </CardDescription>
            </div>
          </div>
          {isSuper ? (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setQ(searchDraft.trim());
                  }}
                  placeholder="Search shop name or slug…"
                  className="pl-9"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setQ(searchDraft.trim())}
              >
                Search
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="mb-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  {isSuper ? <TableHead>Owner</TableHead> : null}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={isSuper ? 5 : 4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : shops.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isSuper ? 5 : 4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No shops yet.{" "}
                      <Link to="/shops/new" className="text-brand-primary underline">
                        Create one
                      </Link>
                    </TableCell>
                  </TableRow>
                ) : (
                  shops.map((shop) => (
                    <TableRow key={shop.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                            {shop.logo?.path ? (
                              <img
                                src={shop.logo.path}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              <Store className="size-3.5 text-muted-foreground" />
                            )}
                          </div>
                          <span className="font-medium">{shop.shop_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {shop.slug}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {shop.status}
                        </Badge>
                      </TableCell>
                      {isSuper ? (
                        <TableCell className="text-sm text-muted-foreground">
                          {shop.user
                            ? `${shop.user.first_name} ${shop.user.last_name}`
                            : shop.user_id}
                        </TableCell>
                      ) : null}
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/shops/${shop.id}`}>
                            <Pencil />
                            Edit
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
