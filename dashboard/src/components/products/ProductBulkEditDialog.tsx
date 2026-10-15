import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layers, Loader2 } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import type { Brand } from "@/lib/brands";
import type { Category } from "@/lib/categories";
import type { ProductBulkResult } from "@/lib/products";
import {
  PRICE_MODE_LABELS,
  PRICE_MODES,
  productBulkEditFormSchema,
  STOCK_MODE_LABELS,
  STOCK_MODES,
  toBulkChanges,
  type ProductBulkEditFormValues,
} from "@/lib/validators/productBulk";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULTS: ProductBulkEditFormValues = {
  status: "keep",
  category_id: "keep",
  brand_id: "keep",
  featured: "keep",
  price_mode: "keep",
  price_value: undefined,
  stock_mode: "keep",
  stock_value: undefined,
};

const STATUS_OPTIONS = [
  ["keep", "Keep current"],
  ["active", "Published"],
  ["draft", "Draft"],
  ["archived", "Archived"],
  ["out_of_stock", "Out of stock"],
] as const;

function numberOrUndefined(raw: string) {
  if (raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function ProductBulkEditDialog({
  open,
  onOpenChange,
  token,
  ids,
  canEditPricing,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string | null;
  ids: string[];
  canEditPricing: boolean;
  onDone: (result: ProductBulkResult) => void;
}) {
  const confirm = useConfirm();
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ProductBulkEditFormValues>({
    resolver: zodResolver(productBulkEditFormSchema),
    defaultValues: DEFAULTS,
  });
  const priceMode = form.watch("price_mode");
  const stockMode = form.watch("stock_mode");

  useEffect(() => {
    if (!open || !token) return;
    form.reset(DEFAULTS);
    setError(null);
    let cancelled = false;
    void Promise.all([
      apiFetch<{ categories: Category[] }>("/api/dashboard/categories?limit=100&active=true", { token }),
      apiFetch<{ brands: Brand[] }>("/api/dashboard/brands?limit=100&active=true", { token }),
    ])
      .then(([c, b]) => {
        if (cancelled) return;
        setCategories(c.categories);
        setBrands(b.brands);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load categories and brands");
      });
    return () => {
      cancelled = true;
    };
  }, [open, token, form]);

  async function onSubmit(values: ProductBulkEditFormValues) {
    const count = ids.length;
    const pricing = values.price_mode !== "keep" || values.stock_mode !== "keep";
    const ok = await confirm({
      tone: "warning",
      title: `Update ${count} product${count === 1 ? "" : "s"}?`,
      description: `The chosen fields will be overwritten on every selected product.${
        pricing ? " Price and stock changes skip variable products (they're set per variant)." : ""
      } This can't be undone automatically.`,
      confirmLabel: "Apply changes",
    });
    if (!ok) return;

    setSaving(true);
    setError(null);
    try {
      const result = await apiFetch<ProductBulkResult>("/api/dashboard/products/bulk", {
        method: "POST",
        token,
        body: { ids, changes: toBulkChanges(values) },
      });
      onDone(result);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Bulk update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="size-5 text-brand-primary" />
            Bulk edit {ids.length} product{ids.length === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            Only fields you change are updated — everything left on “Keep current” stays as it is.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Form {...form}>
          <form id="product-bulk-form" className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STATUS_OPTIONS.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="featured"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Featured</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="keep">Keep current</SelectItem>
                      <SelectItem value="yes">Mark as featured</SelectItem>
                      <SelectItem value="no">Not featured</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="keep">Keep current</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="brand_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="keep">Keep current</SelectItem>
                      <SelectItem value="none">Remove brand</SelectItem>
                      {brands.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {canEditPricing ? (
              <>
                <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2 sm:col-span-2">
                  <FormField
                    control={form.control}
                    name="price_mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="keep">Keep current</SelectItem>
                            {PRICE_MODES.map((m) => (
                              <SelectItem key={m} value={m}>
                                {PRICE_MODE_LABELS[m]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Simple products only; prices never go below 0.</FormDescription>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="price_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="invisible">Value</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="0.01"
                            disabled={priceMode === "keep"}
                            placeholder={priceMode.endsWith("percent") ? "%" : "৳"}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(numberOrUndefined(e.target.value))}
                            onBlur={field.onBlur}
                            name={field.name}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2 sm:col-span-2">
                  <FormField
                    control={form.control}
                    name="stock_mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="keep">Keep current</SelectItem>
                            {STOCK_MODES.map((m) => (
                              <SelectItem key={m} value={m}>
                                {STOCK_MODE_LABELS[m]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Simple products only; stock never goes below 0.</FormDescription>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stock_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="invisible">Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step="1"
                            disabled={stockMode === "keep"}
                            placeholder="Qty"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(numberOrUndefined(e.target.value))}
                            onBlur={field.onBlur}
                            name={field.name}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Price and stock changes are limited to Super Admin, Admin and store owners.
              </p>
            )}
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="product-bulk-form" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Layers />}
            Apply to {ids.length} product{ids.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
