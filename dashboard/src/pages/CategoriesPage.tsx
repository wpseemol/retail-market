import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FolderTree, ImageIcon, Pencil, Plus, Search } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import type { Category } from "@/lib/categories";
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

function CategoryIcon({ category }: { category: Category }) {
  if (category.image?.path) {
    return (
      <img
        src={category.image.path}
        alt=""
        className="size-9 rounded-md object-cover"
      />
    );
  }
  return (
    <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
      <ImageIcon className="size-4" />
    </div>
  );
}

export function CategoriesPage() {
  const { token, user } = useAuthStore();
  const canManage =
    !!user && (MANAGE_ROLES as readonly string[]).includes(user.role);

  const [categories, setCategories] = useState<Category[]>([]);
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
          categories: Category[];
          pagination: { total: number };
        }>(`/api/dashboard/categories?${params.toString()}`, { token });
        if (cancelled) return;
        setCategories(data.categories);
        setTotal(data.pagination.total);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "Failed to load categories",
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

  const colSpan = canManage ? 7 : 6;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Product categories
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Shared catalog categories for every store. Staff manage the tree;
            shops pick a category when adding products.
          </p>
        </div>
        {canManage ? (
          <Button asChild>
            <Link to="/categories/new">
              <Plus />
              Add category
            </Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-md bg-brand-tint text-brand-deep">
            <FolderTree className="size-4" />
          </div>
          <CardTitle>All categories</CardTitle>
          <CardDescription>
            {total} categor{total === 1 ? "y" : "ies"} · platform-wide
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
                placeholder="Search name or slug…"
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
                  <TableHead className="w-[56px]">Icon</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage ? <TableHead className="w-[80px]" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={colSpan}
                      className="text-muted-foreground"
                    >
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : categories.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={colSpan}
                      className="text-muted-foreground"
                    >
                      No categories yet.
                      {canManage ? (
                        <>
                          {" "}
                          <Link
                            to="/categories/new"
                            className="text-brand-primary underline"
                          >
                            Add one
                          </Link>
                        </>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell>
                        <CategoryIcon category={cat} />
                      </TableCell>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        /{cat.slug}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {cat.parent?.name ?? "—"}
                      </TableCell>
                      <TableCell>{cat.products_count ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {cat.is_active ? "active" : "inactive"}
                        </Badge>
                      </TableCell>
                      {canManage ? (
                        <TableCell>
                          <Button asChild variant="ghost" size="icon">
                            <Link to={`/categories/${cat.id}`}>
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
