import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link2, Store, Unlink } from "lucide-react";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { ApiError, apiFetch } from "@/lib/api";
import type { Brand } from "@/lib/brands";
import { brandOwnerSchema, type BrandOwnerValues } from "@/lib/validators/brand";
import { BrandFormSection } from "@/components/brands/BrandFormShell";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StoreOption = { id: string; shop_name: string; slug: string };

const NONE = "__none__";

/** Admin-only: link a brand to one store so that store's vendor can design the brand page. */
export function BrandLinkedStoreCard({
  brand,
  token,
  step,
  onChange,
}: {
  brand: Brand;
  token: string;
  step: string;
  onChange: (brand: Brand) => void;
}) {
  const confirm = useConfirm();
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storesError, setStoresError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const form = useForm<BrandOwnerValues>({
    resolver: zodResolver(brandOwnerSchema),
    defaultValues: { vendor_id: brand.vendor_id ?? "" },
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiFetch<{ shops: StoreOption[] }>("/api/dashboard/shops?limit=100", { token });
        if (!cancelled) setStores(data.shops);
      } catch (err) {
        if (!cancelled) setStoresError(err instanceof ApiError ? err.message : "Could not load stores");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const options =
    brand.vendor && !stores.some((s) => s.id === brand.vendor!.id) ? [brand.vendor, ...stores] : stores;

  async function onSubmit(values: BrandOwnerValues) {
    setStatus(null);
    const next = values.vendor_id || null;
    if ((brand.vendor_id ?? null) === next) {
      setStatus({ tone: "ok", text: "No change" });
      return;
    }
    if (brand.vendor) {
      const ok = await confirm({
        title: next ? `Move “${brand.name}” to another store?` : `Unlink “${brand.name}” from ${brand.vendor.shop_name}?`,
        description: next
          ? `${brand.vendor.shop_name} will lose access to this brand page. The new store's vendor can edit it instead.`
          : `${brand.vendor.shop_name} will no longer be able to edit this brand page. The page design itself is kept.`,
        confirmLabel: next ? "Move brand" : "Unlink store",
        tone: "warning",
      });
      if (!ok) return;
    }
    try {
      const data = await apiFetch<{ brand: Brand; message: string }>(`/api/dashboard/brands/${brand.id}/owner`, {
        method: "PATCH",
        token,
        body: { vendor_id: next },
      });
      onChange(data.brand);
      form.reset({ vendor_id: data.brand.vendor_id ?? "" });
      setStatus({ tone: "ok", text: data.message });
    } catch (err) {
      setStatus({ tone: "error", text: err instanceof ApiError ? err.message : "Could not update linked store" });
    }
  }

  return (
    <BrandFormSection
      step={step}
      title="Linked store"
      description="The linked store's vendor can customize this brand's public page (not its name, slug or visibility)."
    >
      <Form {...form}>
        <div className="space-y-3">
          <FormField
            control={form.control}
            name="vendor_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Store</FormLabel>
                <Select
                  value={field.value || NONE}
                  onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                  disabled={form.formState.isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Not linked" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>Not linked — admins only</SelectItem>
                    {options.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.shop_name} · /{s.slug}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {storesError ?? "Showing the 100 newest stores. Brand pages also list “Sold by” with this store."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={form.formState.isSubmitting}
              onClick={() => void form.handleSubmit(onSubmit)()}
            >
              {form.watch("vendor_id") ? <Link2 className="size-3.5" /> : <Unlink className="size-3.5" />}
              {form.formState.isSubmitting ? "Saving…" : "Save link"}
            </Button>
            {brand.vendor ? (
              <Button asChild type="button" size="sm" variant="ghost">
                <Link to={`/stores/${brand.vendor.slug}/design`}>
                  <Store className="size-3.5" />
                  {brand.vendor.shop_name}
                </Link>
              </Button>
            ) : null}
            {status ? (
              <p
                className={status.tone === "error" ? "text-xs text-destructive" : "text-xs text-brand-primary"}
                role={status.tone === "error" ? "alert" : "status"}
              >
                {status.text}
              </p>
            ) : null}
          </div>
        </div>
      </Form>
    </BrandFormSection>
  );
}
