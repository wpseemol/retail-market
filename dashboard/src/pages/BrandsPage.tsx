import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Search, Tag } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import type { Brand } from "@/lib/brands";
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

const MANAGE_ROLES = ["super_admin", "admin", "moderator"] as const;

export function BrandsPage() {
  const { token, user } = useAuthStore();
  const canManage =
    !!user && (MANAGE_ROLES as readonly string[]).includes(user.role);

  const [brands, setBrands] = useState<Brand[]>([]);
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
        const params = new URLSearchParams({ limit: "100" });
        if (q.trim()) params.set("q", q.trim());
        const data = await apiFetch<{
          brands: Brand[];
          pagination: { total: number };
        }>(`/api/dashboard/brands?${params.toString()}`, { token });
        if (cancelled) return;
        setBrands(data.brands);
        setTotal(data.pagination.total);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "Failed to load brands",
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

  const colSpan = canManage ? 5 : 4;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Brands</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create brands first (Unknown, Handmade, or custom), then assign them
            when adding products.
          </p>
        </div>
        {canManage ? (
          <Button asChild>
            <Link to="/brands/new">
              <Plus />
              Add brand
            </Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-md bg-brand-tint text-brand-deep">
            <Tag className="size-4" />
          </div>
          <CardTitle>All brands</CardTitle>
          <CardDescription>
            {total} brand{total === 1 ? "" : "s"} · shared catalog
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
                placeholder="Search brands…"
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
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage ? <TableHead className="w-[80px]" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={colSpan} className="text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : brands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={colSpan} className="text-muted-foreground">
                      No brands yet.
                      {canManage ? (
                        <>
                          {" "}
                          <Link
                            to="/brands/new"
                            className="text-brand-primary underline"
                          >
                            Add one
                          </Link>
                        </>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ) : (
                  brands.map((brand) => (
                    <TableRow key={brand.id}>
                      <TableCell className="font-medium">{brand.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        /{brand.slug}
                      </TableCell>
                      <TableCell>{brand.products_count ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {brand.is_active ? "active" : "inactive"}
                        </Badge>
                      </TableCell>
                      {canManage ? (
                        <TableCell>
                          <Button asChild variant="ghost" size="icon">
                            <Link to={`/brands/${brand.id}`}>
                              <Pencil />
                            </Link>
                          </Button>
                        </TableCell>
                      ) : null}
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
