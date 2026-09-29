import type { UseFormReturn } from "react-hook-form";
import type { SiteSettingsFormValues } from "@/lib/validators/siteSettings";
import { Badge } from "@/components/ui/badge";
import {
    FormControl,
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

type TrackerRowProps = {
    form: UseFormReturn<SiteSettingsFormValues>;
    label: string;
    enabledField: keyof SiteSettingsFormValues;
    idField: keyof SiteSettingsFormValues;
    idLabel: string;
    idPlaceholder: string;
};

export function TrackerRow({
    form,
    label,
    enabledField,
    idField,
    idLabel,
    idPlaceholder,
}: TrackerRowProps) {
    const enabled = form.watch(enabledField) as boolean;
    const idValue = form.watch(idField) as string;
    const isConnected = enabled && !!idValue.trim();

    return (
        <div className="rounded-xl border border-border/70 bg-background p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{label}</p>
                <Badge
                    variant="outline"
                    className={
                        isConnected
                            ? "border-brand-primary/30 bg-brand-tint/60 text-brand-deep"
                            : "text-muted-foreground"
                    }
                >
                    {isConnected ? "Connected" : "Not connected"}
                </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                <FormField
                    control={form.control}
                    name={enabledField}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">Status</FormLabel>
                            <Select
                                value={field.value ? "active" : "inactive"}
                                onValueChange={(v) => field.onChange(v === "active")}
                            >
                                <FormControl>
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name={idField}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">{idLabel}</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={idPlaceholder}
                                    {...field}
                                    value={field.value as string}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>
    );
}
