import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  Download,
  ImageIcon,
  Layers,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { ApiError, apiDownload, apiFetch } from "@/lib/api";
import {
  NO_BULK_PERMISSIONS,
  productStatusLabel,
  type Product,
  type ProductBulkPermissions,
  type ProductBulkResult,
  type ProductStatus,
} from "@/lib/products";
import { PRODUCT_BULK_MAX_IDS } from "@/lib/validators/productBulk";
import { useAuthStore } from "@/store/auth";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { productStatusTone } from "@/components/products/ProductFormShell";
import { ProductBulkEditDialog } from "@/components/products/ProductBulkEditDialog";
import { ProductImportDialog } from "@/components/products/ProductImportDialog";
import { saveBlob } from "@/components/products/productCsvDownload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Notice = { tone: "success" | "error"; text: string } | null;

function SelectBox({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={label}
      className="size-4 cursor-pointer rounded border-input accent-brand-primary"
    />
  );
}

export function ProductsPage() {
  const { token, user } = useAuthStore();
  const isVendor = user?.role === "vendor";
  const confirm = useConfirm();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [permissions, setPermissions] = useState<ProductBulkPermissions>(NO_BULK_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProductStatus>(
    "all",
  );
  const [reloadKey, setReloadKey] = useState(0);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<Notice>(null);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

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
          permissions?: ProductBulkPermissions;
        }>(`/api/dashboard/products?${params.toString()}`, { token });
        if (cancelled) return;
        setProducts(data.products);
        setTotal(data.pagination.total);
        setPermissions(data.permissions ?? NO_BULK_PERMISSIONS);
        setSelected((prev) => {
          const visible = new Set(data.products.map((p) => p.id));
          return new Set([...prev].filter((id) => visible.has(id)));
        });
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
  }, [token, q, statusFilter, reloadKey]);

  const publishedCount = products.filter((p) => p.status === "active").length;
  const draftCount = products.filter((p) => p.status === "draft").length;

  const canSelect = permissions.bulk_edit || permissions.export || permissions.bulk_delete;
  const pageIds = products.map((p) => p.id);
  const selectedOnPage = pageIds.filter((id) => selected.has(id));
  const allSelected = pageIds.length > 0 && selectedOnPage.length === pageIds.length;
  const selectedIds = [...selected];

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function exportCsv(scope: "filtered" | "selected") {
    setExporting(true);
    setNotice(null);
    try {
      const params = new URLSearchParams();
      if (scope === "selected") {
        params.set("ids", selectedIds.join(","));
      } else {
        if (q.trim()) params.set("q", q.trim());
        if (statusFilter !== "all") params.set("status", statusFilter);
      }
      const { blob, filename } = await apiDownload(
        `/api/dashboard/products/export?${params.toString()}`,
        { token },
      );
      saveBlob(blob, filename ?? `products-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof ApiError ? err.message : "Export failed" });
    } finally {
      setExporting(false);
    }
  }

  async function deleteSelected() {
    const count = selectedIds.length;
    const ok = await confirm({
      title: `Delete ${count} product${count === 1 ? "" : "s"}?`,
      description:
        "The selected products are removed from the dashboard and the storefront, with their variants. Past orders keep their line items. This cannot be undone here.",
      confirmLabel: `Delete ${count} product${count === 1 ? "" : "s"}`,
    });
    if (!ok) return;

    setDeleting(true);
    setNotice(null);
    try {
      const result = await apiFetch<{ message: string; skipped: number }>(
        "/api/dashboard/products/bulk-delete",
        { method: "POST", token, body: { ids: selectedIds } },
      );
      setNotice({
        tone: "success",
        text: result.skipped > 0 ? `${result.message} · ${result.skipped} already gone` : result.message,
      });
      setSelected(new Set());
      setReloadKey((k) => k + 1);
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof ApiError ? err.message : "Bulk delete failed" });
    } finally {
      setDeleting(false);
    }
  }

  function onBulkDone(result: ProductBulkResult) {
    const skipped = result.skipped.length;
    setNotice({
      tone: "success",
      text:
        skipped > 0
          ? `${result.message} · ${skipped} skipped (${result.skipped[0]!.reason}${skipped > 1 ? ", …" : ""})`
          : result.message,
    });
    setSelected(new Set());
    setReloadKey((k) => k + 1);
  }

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
        <div className="flex flex-wrap gap-2">
          {permissions.export ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={exporting}>
                  {exporting ? <Loader2 className="animate-spin" /> : <Download />}
                  Export
                  <ChevronDown className="size-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  CSV · opens in Excel, Sheets, Shopify format
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void exportCsv("filtered")}>
                  {q || statusFilter !== "all" ? "Export filtered products" : "Export all products"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={selectedIds.length === 0}
                  onSelect={() => void exportCsv("selected")}
                >
                  Export selected ({selectedIds.length})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          {permissions.import ? (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload />
              Import
            </Button>
          ) : null}
          <Button asChild>
            <Link to="/products/new">
              <Plus />
              Add product
            </Link>
          </Button>
        </div>
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

      {notice ? (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={cn(
            "flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
            notice.tone === "error"
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-brand-primary/30 bg-brand-tint/60 text-brand-deep",
          )}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="rounded p-0.5 opacity-70 hover:opacity-100"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

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

          {canSelect && products.length > 0 ? (
            <div
              className={cn(
                "sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2",
                selected.size > 0
                  ? "border-brand-primary/30 bg-brand-tint/80 backdrop-blur"
                  : "border-border/70 bg-muted/30",
              )}
            >
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <SelectBox
                  checked={allSelected}
                  indeterminate={selectedOnPage.length > 0}
                  onChange={(checked) => setSelected(checked ? new Set(pageIds) : new Set())}
                  label="Select all products on this page"
                />
                <span className={selected.size > 0 ? "font-medium text-brand-deep" : "text-muted-foreground"}>
                  {selected.size > 0
                    ? `${selected.size} product${selected.size === 1 ? "" : "s"} selected`
                    : "Select all"}
                </span>
              </label>
              {selected.size > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {permissions.bulk_edit ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-background"
                      disabled={selected.size > PRODUCT_BULK_MAX_IDS}
                      onClick={() => setBulkOpen(true)}
                    >
                      <Layers />
                      Bulk edit
                    </Button>
                  ) : null}
                  {permissions.export ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-background"
                      disabled={exporting}
                      onClick={() => void exportCsv("selected")}
                    >
                      {exporting ? <Loader2 className="animate-spin" /> : <Download />}
                      Export selected
                    </Button>
                  ) : null}
                  {permissions.bulk_delete ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={deleting}
                      onClick={() => void deleteSelected()}
                    >
                      {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                      Delete selected
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                    Clear
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

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
              <div className="mt-4 flex justify-center gap-2">
                <Button asChild size="sm">
                  <Link to="/products/new">
                    <Plus />
                    Create first product
                  </Link>
                </Button>
                {permissions.import ? (
                  <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                    <Upload />
                    Import CSV
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => {
                const isSelected = selected.has(product.id);
                return (
                  <div
                    key={product.id}
                    className={cn(
                      "group flex flex-col gap-3 rounded-xl border bg-gradient-to-br from-background to-muted/30 p-4 transition-shadow hover:shadow-md",
                      isSelected ? "border-brand-primary/50 ring-1 ring-brand-primary/30" : "border-border",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {canSelect ? (
                        <div className="pt-0.5">
                          <SelectBox
                            checked={isSelected}
                            onChange={(checked) => toggle(product.id, checked)}
                            label={`Select ${product.name}`}
                          />
                        </div>
                      ) : null}
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ProductImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        token={token}
        isVendor={!permissions.all_stores}
        onImported={() => setReloadKey((k) => k + 1)}
      />
      <ProductBulkEditDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        token={token}
        ids={selectedIds}
        canEditPricing={permissions.bulk_edit_pricing}
        onDone={onBulkDone}
      />
    </div>
  );
}
