import type { ReactNode } from "react";
import { Languages } from "lucide-react";
import { useFormContext, type FieldValues, type Path } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type CopyProps = {
  /** e.g. "Shoppers using Bangla see this name; …" */
  help: string;
  nameLabel?: string;
  descriptionLabel?: string;
  descriptionRows?: number;
  nameMax: number;
  descriptionMax: number;
  namePlaceholder: string;
  descriptionPlaceholder: string;
  englishName: string;
  disabled?: boolean;
};

function ToggleShell({
  children,
  label,
  help,
}: {
  children: ReactNode;
  label: ReactNode;
  help: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/80 bg-muted/30 px-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand-deep">
          <Languages className="size-4" />
        </span>
        <div className="min-w-0 space-y-0.5">
          {label}
          {help}
        </div>
      </div>
      {children}
    </div>
  );
}

const optional = (
  <span className="font-normal text-muted-foreground">(optional)</span>
);

function namePlaceholderFor(englishName: string, fallback: string) {
  return englishName ? `Bangla for “${englishName}”` : fallback;
}

/** Controlled version for pages that keep form state in `useState`. */
export function BanglaVersionFields({
  enabled,
  onEnabledChange,
  nameBn,
  onNameBnChange,
  descriptionBn,
  onDescriptionBnChange,
  help,
  nameLabel = "Bangla name",
  descriptionLabel = "Bangla description",
  descriptionRows = 3,
  nameMax,
  descriptionMax,
  namePlaceholder,
  descriptionPlaceholder,
  englishName,
  disabled,
}: CopyProps & {
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  nameBn: string;
  onNameBnChange: (value: string) => void;
  descriptionBn: string;
  onDescriptionBnChange: (value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <ToggleShell
        label={
          <Label htmlFor="bn-toggle" className="text-sm font-medium">
            Add Bangla version
          </Label>
        }
        help={<p className="text-xs text-muted-foreground">{help}</p>}
      >
        <Switch
          id="bn-toggle"
          checked={enabled}
          onCheckedChange={onEnabledChange}
          disabled={disabled}
        />
      </ToggleShell>

      {enabled ? (
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="name_bn">
              {nameLabel} {optional}
            </Label>
            <Input
              id="name_bn"
              lang="bn"
              value={nameBn}
              onChange={(e) => onNameBnChange(e.target.value)}
              maxLength={nameMax}
              placeholder={namePlaceholderFor(englishName, namePlaceholder)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description_bn">
              {descriptionLabel} {optional}
            </Label>
            <Textarea
              id="description_bn"
              lang="bn"
              value={descriptionBn}
              onChange={(e) => onDescriptionBnChange(e.target.value)}
              rows={descriptionRows}
              maxLength={descriptionMax}
              placeholder={descriptionPlaceholder}
              disabled={disabled}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** shadcn `Form` version — must render inside `<Form {...form}>`. */
export function BanglaVersionFormFields<T extends FieldValues>({
  enabledField,
  nameField,
  descriptionField,
  extraFields = [],
  children,
  onBeforeDisable,
  help,
  nameLabel = "Bangla name",
  descriptionLabel = "Bangla description",
  descriptionRows = 3,
  nameMax,
  descriptionMax,
  namePlaceholder,
  descriptionPlaceholder,
  englishName,
  disabled,
}: CopyProps & {
  enabledField: Path<T>;
  nameField: Path<T>;
  descriptionField: Path<T>;
  /** Other Bangla string fields rendered via `children`; cleared with the rest when switched off. */
  extraFields?: Path<T>[];
  /** Extra Bangla inputs shown below the built-in ones while the switch is on. */
  children?: ReactNode;
  /** Return false to keep the switch on (e.g. the user cancelled a confirm). */
  onBeforeDisable?: () => Promise<boolean>;
}) {
  const form = useFormContext<T>();
  const enabled = Boolean(form.watch(enabledField));

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name={enabledField}
        render={({ field }) => (
          <FormItem>
            <ToggleShell
              label={
                <FormLabel className="text-sm font-medium">
                  Add Bangla version
                </FormLabel>
              }
              help={<FormDescription className="text-xs">{help}</FormDescription>}
            >
              <FormControl>
                <Switch
                  checked={Boolean(field.value)}
                  disabled={disabled}
                  onCheckedChange={async (next) => {
                    if (!next && onBeforeDisable && !(await onBeforeDisable())) {
                      return;
                    }
                    if (!next) {
                      const blank = "" as T[Path<T>];
                      const fields = [nameField, descriptionField, ...extraFields];
                      for (const name of fields) {
                        form.setValue(name, blank, { shouldDirty: true });
                      }
                      form.clearErrors(fields);
                    }
                    field.onChange(next);
                  }}
                />
              </FormControl>
            </ToggleShell>
          </FormItem>
        )}
      />

      {enabled ? (
        <div className="grid gap-4">
          <FormField
            control={form.control}
            name={nameField}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {nameLabel} {optional}
                </FormLabel>
                <FormControl>
                  <Input
                    lang="bn"
                    maxLength={nameMax}
                    placeholder={namePlaceholderFor(englishName, namePlaceholder)}
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
            name={descriptionField}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {descriptionLabel} {optional}
                </FormLabel>
                <FormControl>
                  <Textarea
                    lang="bn"
                    rows={descriptionRows}
                    maxLength={descriptionMax}
                    placeholder={descriptionPlaceholder}
                    disabled={disabled}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {children}
        </div>
      ) : null}
    </div>
  );
}
