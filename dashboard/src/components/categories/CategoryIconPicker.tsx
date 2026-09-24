import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import {
  CATEGORY_ICONS,
  type CategoryIconGroup,
  getCategoryLucideIcon,
} from "@/lib/categoryIcons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type CategoryIconPickerProps = {
  value: string | null;
  onChange: (icon: string | null) => void;
  disabled?: boolean;
  /** Hide the top label/preview row when the parent section already shows context. */
  compact?: boolean;
};

const ALL_GROUPS = Array.from(
  new Set(CATEGORY_ICONS.map((i) => i.group)),
) as CategoryIconGroup[];

export function CategoryIconPicker({
  value,
  onChange,
  disabled = false,
  compact = false,
}: CategoryIconPickerProps) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<CategoryIconGroup | "All">("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATEGORY_ICONS.filter((item) => {
      if (group !== "All" && item.group !== group) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q)
      );
    });
  }, [query, group]);

  const SelectedIcon = getCategoryLucideIcon(value);

  return (
    <div className="space-y-3">
      {!compact ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Label>Category icon</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Choose from {CATEGORY_ICONS.length}+ SVG icons for storefront &
              admin.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-12 items-center justify-center rounded-xl border bg-brand-tint text-brand-deep",
                !value && "bg-muted text-muted-foreground",
              )}
            >
              <SelectedIcon className="size-5" strokeWidth={1.75} />
            </div>
            {value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => onChange(null)}
              >
                <X className="size-3.5" />
                Clear
              </Button>
            ) : null}
          </div>
        </div>
      ) : value ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            <X className="size-3.5" />
            Clear icon
          </Button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        <div className="space-y-3 border-b border-border bg-muted/30 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icons…"
              className="pl-9"
              disabled={disabled}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setGroup("All")}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                group === "All"
                  ? "bg-brand-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-brand-tint hover:text-brand-deep",
              )}
            >
              All
            </button>
            {ALL_GROUPS.map((g) => (
              <button
                key={g}
                type="button"
                disabled={disabled}
                onClick={() => setGroup(g)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  group === g
                    ? "bg-brand-primary text-white"
                    : "bg-muted text-muted-foreground hover:bg-brand-tint hover:text-brand-deep",
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[280px] overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No icons match “{query}”.
            </p>
          ) : (
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-8">
              {filtered.map((item) => {
                const active = value === item.name;
                const Icon = item.Icon;
                return (
                  <button
                    key={item.name}
                    type="button"
                    title={item.label}
                    disabled={disabled}
                    onClick={() => onChange(item.name)}
                    className={cn(
                      "group relative flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-transparent bg-muted/40 text-muted-foreground transition-all hover:border-brand-primary/40 hover:bg-brand-tint hover:text-brand-deep",
                      active &&
                        "border-brand-primary bg-brand-tint text-brand-deep ring-2 ring-brand-primary/30",
                    )}
                  >
                    <Icon className="size-5" strokeWidth={1.75} />
                    {active ? (
                      <span className="absolute top-1 right-1 flex size-3.5 items-center justify-center rounded-full bg-brand-primary text-white">
                        <Check className="size-2.5" strokeWidth={3} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          {filtered.length} icon{filtered.length === 1 ? "" : "s"}
          {value ? (
            <>
              {" "}
              · selected <span className="font-medium text-foreground">{value}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type CategoryIconBadgeProps = {
  icon?: string | null;
  imageUrl?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_MAP = {
  sm: { box: "size-9", icon: "size-4", rounded: "rounded-lg" },
  md: { box: "size-12", icon: "size-5", rounded: "rounded-xl" },
  lg: { box: "size-16", icon: "size-7", rounded: "rounded-2xl" },
} as const;

export function CategoryIconBadge({
  icon,
  imageUrl,
  name,
  size = "md",
  className,
}: CategoryIconBadgeProps) {
  const dims = SIZE_MAP[size];
  const Icon = getCategoryLucideIcon(icon);

  if (imageUrl) {
    return (
      <div
        className={cn(
          "shrink-0 overflow-hidden border border-border bg-muted",
          dims.box,
          dims.rounded,
          className,
        )}
      >
        <img
          src={imageUrl}
          alt={name ?? ""}
          className="size-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center border border-brand-primary/15 bg-gradient-to-br from-brand-tint to-background text-brand-deep",
        dims.box,
        dims.rounded,
        className,
      )}
      title={icon ?? "Category"}
    >
      <Icon className={dims.icon} strokeWidth={1.75} />
    </div>
  );
}
