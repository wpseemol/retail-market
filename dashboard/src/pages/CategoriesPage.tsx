import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FolderTree,
  Package,
  Pencil,
  Plus,
  Search,
  Layers,
} from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import type { Category } from "@/lib/categories";
import { CATEGORY_ICONS } from "@/lib/categoryIcons";
import { useAuthStore } from "@/store/auth";
import { CategoryIconBadge } from "@/components/categories/CategoryIconPicker";
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

const MANAGE_ROLES = ["super_admin", "admin", "moderator"] as const;

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
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
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
        if (statusFilter === "active") params.set("active", "true");
        if (statusFilter === "inactive") params.set("active", "false");
        if (statusFilter === "all") params.set("active", "all");
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
  }, [token, q, statusFilter]);

  const activeCount = categories.filter((c) => c.is_active).length;
  const withIconCount = categories.filter((c) => c.icon || c.image).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Product categories
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Shared catalog tree with SVG icons. Staff manage categories; stores
            pick one when adding products.
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

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-border/80">
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-tint text-brand-deep">
              <Layers className="size-4" />
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
              <FolderTree className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active (page)</p>
              <p className="text-xl font-semibold tabular-nums">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-tint text-brand-deep">
              <Package className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Icon library</p>
              <p className="text-xl font-semibold tabular-nums">
                {CATEGORY_ICONS.length}+
              </p>
              <p className="text-[11px] text-muted-foreground">
                {withIconCount} with icon on this page
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-2 flex size-9 items-center justify-center rounded-md bg-brand-tint text-brand-deep">
                <FolderTree className="size-4" />
              </div>
              <CardTitle>Catalog</CardTitle>
              <CardDescription>
                Browse, search, and edit platform categories
              </CardDescription>
            </div>
            <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
              {(
                [
                  ["all", "All"],
                  ["active", "Active"],
                  ["inactive", "Inactive"],
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

          {loading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Loading categories…
            </p>
          ) : categories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">No categories yet.</p>
              {canManage ? (
                <Button asChild className="mt-4" size="sm">
                  <Link to="/categories/new">
                    <Plus />
                    Create first category
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="group relative flex flex-col gap-3 rounded-xl border border-border bg-gradient-to-br from-background to-muted/30 p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <CategoryIconBadge
                      icon={cat.icon}
                      imageUrl={cat.image?.path}
                      name={cat.name}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold tracking-tight">
                            {cat.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            /{cat.slug}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            cat.is_active
                              ? "border-brand-primary/30 bg-brand-tint/50 text-brand-deep capitalize"
                              : "capitalize"
                          }
                        >
                          {cat.is_active ? "active" : "inactive"}
                        </Badge>
                      </div>
                      {cat.description ? (
                        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                          {cat.description}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/70 pt-3 text-xs text-muted-foreground">
                    <span>
                      Parent:{" "}
                      <span className="text-foreground">
                        {cat.parent?.name ?? "Top level"}
                      </span>
                    </span>
                    <span className="text-border">·</span>
                    <span>
                      Products:{" "}
                      <span className="font-medium text-foreground tabular-nums">
                        {cat.products_count ?? 0}
                      </span>
                    </span>
                    {cat.icon ? (
                      <>
                        <span className="text-border">·</span>
                        <span className="truncate">{cat.icon}</span>
                      </>
                    ) : null}
                    <div className="ml-auto">
                      {canManage ? (
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                        >
                          <Link to={`/categories/${cat.id}`}>
                            <Pencil className="size-3.5" />
                            Edit
                          </Link>
                        </Button>
                      ) : null}
                    </div>
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
