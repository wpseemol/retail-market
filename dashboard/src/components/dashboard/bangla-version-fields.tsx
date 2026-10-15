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
            <Label htmlFor="description_bn">Bangla description {optional}</Label>
            <Textarea
              id="description_bn"
              lang="bn"
              value={descriptionBn}
              onChange={(e) => onDescriptionBnChange(e.target.value)}
              rows={3}
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
  onBeforeDisable,
  help,
  nameLabel = "Bangla name",
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
                      form.setValue(nameField, blank, { shouldDirty: true });
                      form.setValue(descriptionField, blank, { shouldDirty: true });
                      form.clearErrors([nameField, descriptionField]);
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
                <FormLabel>Bangla description {optional}</FormLabel>
                <FormControl>
                  <Textarea
                    lang="bn"
                    rows={3}
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
        </div>
      ) : null}
    </div>
  );
}
