import { useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/money";
import {
  shippingSettingsFormSchema,
  toShippingApiBody,
  toShippingFormValues,
  type ShippingSettingsDto,
  type ShippingSettingsFormValues,
} from "@/lib/validators/shipping";
import {
  FormStatusMessage,
  StickyFormActions,
} from "@/components/dashboard/page-shell";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

const ENDPOINT = "/api/dashboard/site-settings/shipping";

function MoneyInput({
  value,
  onChange,
  onBlur,
  name,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  onBlur: () => void;
  name: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex">
      <span className="flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
        ৳
      </span>
      <Input
        type="number"
        min={0}
        step="1"
        name={name}
        disabled={disabled}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        onBlur={onBlur}
        className="rounded-l-none"
      />
    </div>
  );
}

export function ShippingSettingsPanel({ token }: { token: string }) {
  const formId = useId();
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const form = useForm<ShippingSettingsFormValues>({
    resolver: zodResolver(shippingSettingsFormSchema),
    defaultValues: { default_fee: 60, free_enabled: false, free_threshold: 1000, vendor_override: true },
  });

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ shipping: ShippingSettingsDto }>(ENDPOINT, { token })
      .then((data) => {
        if (cancelled) return;
        form.reset(toShippingFormValues(data.shipping));
        setLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : "Could not load shipping settings");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, form]);

  async function onSubmit(values: ShippingSettingsFormValues) {
    try {
      const data = await apiFetch<{ message: string; shipping: ShippingSettingsDto }>(ENDPOINT, {
        method: "PATCH",
        token,
        body: toShippingApiBody(values),
      });
      form.reset(toShippingFormValues(data.shipping));
      setSuccess(data.message);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
      setSuccess(null);
    }
  }

  if (loadError) {
    return <p className="text-sm text-destructive" role="alert">{loadError}</p>;
  }
  if (!loaded) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  const { isSubmitting, isDirty } = form.formState;
  const defaultFee = form.watch("default_fee");
  const freeEnabled = form.watch("free_enabled");
  const freeThreshold = form.watch("free_threshold");

  return (
    <div className="space-y-5">
      <Form {...form}>
        <form
          id={formId}
          onSubmit={form.handleSubmit((v) => void onSubmit(v))}
          className="space-y-4"
        >
          <section className="rounded-xl border border-border/80 bg-background p-4 sm:p-5">
            <FormField
              control={form.control}
              name="default_fee"
              render={({ field }) => (
                <FormItem className="max-w-sm">
                  <FormLabel>Default shipping cost</FormLabel>
                  <FormControl>
                    <MoneyInput
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  <FormDescription>
                    Charged for every product that has no shipping fee of its own. Use 0 for free delivery by default.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <section className="rounded-xl border border-border/80 bg-background p-4 sm:p-5">
            <FormField
              control={form.control}
              name="free_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-3 space-y-0">
                  <div>
                    <FormLabel>Free shipping on large orders</FormLabel>
                    <FormDescription>The whole order ships free once the subtotal reaches this amount.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            {freeEnabled ? (
              <FormField
                control={form.control}
                name="free_threshold"
                render={({ field }) => (
                  <FormItem className="mt-4 max-w-sm">
                    <FormLabel>Minimum order for free shipping</FormLabel>
                    <FormControl>
                      <MoneyInput
                        name={field.name}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
          </section>

          <section className="rounded-xl border border-border/80 bg-background p-4 sm:p-5">
            <FormField
              control={form.control}
              name="vendor_override"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-3 space-y-0">
                  <div>
                    <FormLabel>Store owners can set their own shipping cost</FormLabel>
                    <FormDescription>
                      When on, store owners can give each product a different shipping fee while adding or editing it.
                      Admins can always change it.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </section>
        </form>
      </Form>

      <div className="flex gap-3 rounded-xl border border-border/80 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-brand-primary" />
        <p>
          How customers are charged: each store ships its items as one parcel, so an order pays the highest
          shipping fee from each store once. For example, two default-priced items from the same store cost{" "}
          {formatPrice(defaultFee || 0)} to ship, not double.
          {freeEnabled && freeThreshold > 0
            ? ` Orders of ${formatPrice(freeThreshold)} or more ship free.`
            : ""}
        </p>
      </div>

      <StickyFormActions
        message={
          <FormStatusMessage
            error={error}
            success={success}
            idle={isDirty ? "Unsaved shipping changes." : "Shipping cost is calculated on the server at checkout."}
          />
        }
      >
        <Button type="submit" form={formId} disabled={isSubmitting || !isDirty}>
          {isSubmitting ? "Saving…" : "Save shipping"}
        </Button>
      </StickyFormActions>
    </div>
  );
}
