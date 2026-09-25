import type { ReactNode } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WhereItShows({
  type,
  where,
  description,
}: {
  type: string;
  where: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-brand-primary/25 bg-linear-to-br from-brand-tint/30 via-background to-muted/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-brand-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          {type}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <MapPin className="size-3.5 text-brand-primary" />
          Where it shows
        </span>
      </div>
      <p className="mt-2 text-sm font-medium text-foreground">{where}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function FieldHint({ children }: { children: ReactNode }) {
  return <p className="text-[11px] leading-relaxed text-muted-foreground">{children}</p>;
}

export function EditorCard({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "space-y-3 rounded-xl border border-border bg-background p-4 sm:p-5",
        className,
      )}
    >
      <div>
        <h4 className="text-sm font-semibold">{title}</h4>
        {hint ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function StickyEditorActions({
  dirty,
  saving,
  onReset,
  saveLabel = "Save section",
}: {
  dirty: boolean;
  saving: boolean;
  onReset?: () => void;
  saveLabel?: string;
}) {
  return (
    <>
      <div className="h-14" aria-hidden />
      <div className="sticky bottom-3 z-20 rounded-2xl border border-border/80 bg-background/95 p-3 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 text-sm text-muted-foreground">
            {dirty ? "Unsaved changes on this section." : "All changes saved."}
          </p>
          <div className="flex flex-wrap gap-2">
            {onReset ? (
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={onReset}
              >
                Reset defaults
              </Button>
            ) : null}
            <Button type="submit" size="lg" disabled={saving || !dirty}>
              {saving ? "Saving…" : saveLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export function NumberInput({
  value,
  onChange,
  onBlur,
  name,
  inputRef,
  min,
  max,
  placeholder,
}: {
  value: number;
  onChange: (n: number) => void;
  onBlur: () => void;
  name: string;
  inputRef: React.Ref<HTMLInputElement>;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      placeholder={placeholder}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      value={Number.isFinite(value) ? value : ""}
      onChange={(e) => {
        const raw = e.target.value;
        const n = Number(raw);
        onChange(raw === "" || Number.isNaN(n) ? (min ?? 0) : n);
      }}
      onBlur={onBlur}
      name={name}
      ref={inputRef}
    />
  );
}
