import { Languages } from "lucide-react";
import { useFormContext } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import type { BrandFormValues } from "@/lib/validators/brand";

type Props = {
  disabled?: boolean;
  /** Return false to keep the switch on (e.g. the user cancelled a confirm). */
  onBeforeDisable?: () => Promise<boolean>;
};

/** Optional Bangla copy. The slug is shared; the storefront falls back to English when empty. */
export function BrandBanglaFields({ disabled, onBeforeDisable }: Props) {
  const form = useFormContext<BrandFormValues>();
  const enabled = form.watch("bn_enabled");
  const englishName = form.watch("name").trim();

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="bn_enabled"
        render={({ field }) => (
          <FormItem className="flex items-start justify-between gap-4 rounded-xl border border-border/80 bg-muted/30 px-4 py-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand-deep">
                <Languages className="size-4" />
              </span>
              <div className="min-w-0 space-y-0.5">
                <FormLabel className="text-sm font-medium">
                  Add Bangla version
                </FormLabel>
                <FormDescription className="text-xs">
                  Optional. Shoppers using Bangla see this name and description
                  on the brand page and lists; if empty they see the English
                  text. The slug stays the same.
                </FormDescription>
              </div>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                disabled={disabled}
                onCheckedChange={async (next) => {
                  if (!next && onBeforeDisable && !(await onBeforeDisable())) {
                    return;
                  }
                  if (!next) {
                    form.setValue("name_bn", "", { shouldDirty: true });
                    form.setValue("description_bn", "", { shouldDirty: true });
                    form.clearErrors(["name_bn", "description_bn"]);
                  }
                  field.onChange(next);
                }}
              />
            </FormControl>
          </FormItem>
        )}
      />

      {enabled ? (
        <div className="grid gap-4">
          <FormField
            control={form.control}
            name="name_bn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Bangla name{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    lang="bn"
                    maxLength={120}
                    placeholder={
                      englishName ? `Bangla for “${englishName}”` : "হ্যান্ডমেড"
                    }
                    disabled={disabled}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description_bn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Bangla description{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    lang="bn"
                    rows={3}
                    maxLength={500}
                    placeholder="ব্র্যান্ড সম্পর্কে ছোট বিবরণ (সর্বোচ্চ ৫০০ অক্ষর)"
                    disabled={disabled}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ) : null}
    </div>
  );
}
