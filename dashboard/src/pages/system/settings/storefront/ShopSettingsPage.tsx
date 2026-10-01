import { LayoutGrid } from "lucide-react";
import {
    SHOP_FACET_VISIBLE_OPTIONS,
    SHOP_PER_PAGE_OPTIONS,
    SHOP_VIEW_OPTIONS,
    type SiteSettingsFormValues,
} from "@/lib/validators/siteSettings";
import { SettingsSection } from "@/components/settings/SettingsSection";
import {
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
import { GeneralSettingsForm } from "../GeneralSettingsForm";
import { useSiteSettings } from "../settingsContext";

type NumberField =
    | "shop_products_per_page"
    | "shop_categories_visible"
    | "shop_brands_visible";

function CountSelect({
    name,
    label,
    description,
    options,
    suffix,
}: {
    name: NumberField;
    label: string;
    description: string;
    options: readonly number[];
    suffix: string;
}) {
    const { form } = useSiteSettings();
    return (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <Select
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                        disabled={form.formState.isSubmitting}
                    >
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select count" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {options.map((n) => (
                                <SelectItem key={n} value={String(n)}>
                                    {n} {suffix}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormDescription>{description}</FormDescription>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

function LabelInput({
    name,
    label,
    placeholder,
    description,
}: {
    name: keyof Pick<SiteSettingsFormValues, "shop_see_all_label" | "shop_show_less_label">;
    label: string;
    placeholder: string;
    description: string;
}) {
    const { form } = useSiteSettings();
    return (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        <Input placeholder={placeholder} {...field} />
                    </FormControl>
                    <FormDescription>{description}</FormDescription>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

export function ShopSettingsPage() {
    const { form } = useSiteSettings();

    return (
        <GeneralSettingsForm>
            <SettingsSection
                title="Shop catalog"
                description="Default product grid, pagination, and sidebar category/brand preview on /shop."
                icon={LayoutGrid}
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="shop_default_view"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Default product view</FormLabel>
                                <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    disabled={form.formState.isSubmitting}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select view" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {SHOP_VIEW_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormDescription>
                                    Initial layout when shoppers open /shop (they can still switch in the
                                    toolbar).
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <CountSelect
                        name="shop_products_per_page"
                        label="Default products per page"
                        description="Selected when shoppers open /shop. They can still switch between 12, 24, 36 and 48 (plus this value) in the toolbar."
                        options={SHOP_PER_PAGE_OPTIONS}
                        suffix="per page"
                    />
                    <CountSelect
                        name="shop_categories_visible"
                        label="Categories shown"
                        description="How many categories appear before the expand button."
                        options={SHOP_FACET_VISIBLE_OPTIONS}
                        suffix="categories"
                    />
                    <CountSelect
                        name="shop_brands_visible"
                        label="Brands shown"
                        description="How many brands appear before the expand button."
                        options={SHOP_FACET_VISIBLE_OPTIONS}
                        suffix="brands"
                    />
                    <LabelInput
                        name="shop_see_all_label"
                        label="Expand button label"
                        placeholder="See all"
                        description="Shown when more categories/brands are hidden."
                    />
                    <LabelInput
                        name="shop_show_less_label"
                        label="Collapse button label"
                        placeholder="Show less"
                        description="Shown after the list is expanded."
                    />
                </div>
            </SettingsSection>
        </GeneralSettingsForm>
    );
}
