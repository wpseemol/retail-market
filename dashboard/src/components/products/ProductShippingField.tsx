import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Lock, Truck } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/money";
import type { ProductFormValues } from "@/lib/validators/product";
import { useAuthStore } from "@/store/auth";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type ShippingDefaults = {
  default_fee: number;
  free_threshold: number | null;
  vendor_override: boolean;
  can_edit: boolean;
};

/** Per-product shipping fee inside the product create/edit `<Form>`. */
export function ProductShippingField() {
  const { token } = useAuthStore();
  const form = useFormContext<ProductFormValues>();
  const [defaults, setDefaults] = useState<ShippingDefaults | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiFetch<{ shipping: ShippingDefaults }>("/api/dashboard/products/shipping-defaults", { token })
      .then((data) => {
        if (!cancelled) setDefaults(data.shipping);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = form.watch("shipping_fee");
  const custom = value !== null;
  const canEdit = defaults?.can_edit ?? true;
  const defaultLabel = defaults ? formatPrice(defaults.default_fee) : "the store default";

  return (
    <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Truck className="mt-0.5 size-4 shrink-0 text-brand-primary" />
          <div>
            <p className="text-sm font-medium">Shipping cost</p>
            <p className="text-xs text-muted-foreground">
              {custom
                ? "This product uses its own delivery charge."
                : `Uses the store default (${defaultLabel}).`}
              {defaults?.free_threshold != null
                ? ` Orders from ${formatPrice(defaults.free_threshold)} ship free.`
                : ""}
            </p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Custom fee
          <Switch
            checked={custom}
            disabled={!canEdit}
            onCheckedChange={(on) =>
              form.setValue("shipping_fee", on ? (defaults?.default_fee ?? 0) : null, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            aria-label="Set a custom shipping fee for this product"
          />
        </label>
      </div>

      {custom ? (
        <FormField
          control={form.control}
          name="shipping_fee"
          render={({ field }) => (
            <FormItem className="mt-4 max-w-xs">
              <FormLabel>Shipping fee (BDT)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  disabled={!canEdit}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value) || 0))
                  }
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormDescription>
                Enter 0 for free shipping. Each store charges its highest item fee once per order.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {!canEdit ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3.5" />
          The site admin has turned off custom shipping fees for store owners.
        </p>
      ) : null}
    </div>
  );
}
