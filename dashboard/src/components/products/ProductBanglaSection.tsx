import { useFormContext } from "react-hook-form";
import { BanglaVersionFormFields } from "@/components/dashboard/bangla-version-fields";
import { ProductFormSection } from "@/components/products/ProductFormShell";
import { RichTextEditor } from "@/components/products/RichTextEditor";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { ProductFormValues } from "@/lib/validators/product";

type Props = {
  step: string;
  disabled?: boolean;
  /** Return false to keep the switch on (e.g. the user cancelled a confirm). */
  onBeforeDisable?: () => Promise<boolean>;
};

/** Optional Bangla name, short description and rich description. Slug and everything else stay shared. */
export function ProductBanglaSection({ step, disabled, onBeforeDisable }: Props) {
  const form = useFormContext<ProductFormValues>();
  const englishName = form.watch("name").trim();

  return (
    <ProductFormSection
      step={step}
      title="Bangla version"
      description="Optional — skip it and the storefront shows the English text in Bangla too."
    >
      <BanglaVersionFormFields<ProductFormValues>
        help="Optional. Shoppers using Bangla see these texts on product cards and the product page; any empty field falls back to English. The slug, price, stock and images stay the same."
        nameMax={255}
        descriptionLabel="Bangla short description"
        descriptionMax={500}
        descriptionRows={2}
        namePlaceholder="পণ্যের নাম"
        descriptionPlaceholder="ক্যাটালগ কার্ডের জন্য এক লাইনের সারাংশ"
        englishName={englishName}
        enabledField="bn_enabled"
        nameField="name_bn"
        descriptionField="short_description_bn"
        extraFields={["description_bn"]}
        onBeforeDisable={onBeforeDisable}
        disabled={disabled}
      >
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
                <RichTextEditor
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                  placeholder="উপাদান, মাপ, যত্ন ও অন্যান্য বিবরণ…"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </BanglaVersionFormFields>
    </ProductFormSection>
  );
}
