import { useEffect, useMemo, useRef, useState } from "react";
import { Check, LocateFixed, Search, X } from "lucide-react";
import {
  CATEGORY_ICONS,
  type CategoryIconGroup,
  getCategoryLucideIcon,
} from "@/lib/icons";
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

  const selected = value
    ? CATEGORY_ICONS.find((item) => item.name === value)
    : undefined;
  const SelectedIcon = getCategoryLucideIcon(value);
  const selectedLabel = selected?.label ?? value;
  const selectedHidden =
    Boolean(value) && !filtered.some((item) => item.name === value);

  const gridRef = useRef<HTMLDivElement>(null);
  const [scrollTarget, setScrollTarget] = useState<string | null>(value);

  useEffect(() => {
    if (!scrollTarget) return;
    const container = gridRef.current;
    const tile = container?.querySelector<HTMLElement>(
      `[data-icon="${CSS.escape(scrollTarget)}"]`,
    );
    if (container && tile) {
      container.scrollTop =
        tile.offsetTop - container.clientHeight / 2 + tile.offsetHeight / 2;
    }
    setScrollTarget(null);
  }, [scrollTarget, filtered]);

  function showSelected() {
    if (!value) return;
    setQuery("");
    setGroup("All");
    setScrollTarget(value);
  }

  return (
    <div className="space-y-3">
      {!compact ? (
        <div>
          <Label>Category icon</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Choose from {CATEGORY_ICONS.length}+ SVG icons for storefront &
            admin.
          </p>
        </div>
      ) : null}

      <div
        className={cn(
          "flex flex-wrap items-center gap-4 rounded-xl border p-3",
          value
            ? "border-brand-primary/40 bg-brand-tint/40"
            : "border-dashed border-border bg-muted/20",
        )}
      >
        <div
          className={cn(
            "flex size-14 shrink-0 items-center justify-center rounded-xl border",
            value
              ? "border-brand-primary/30 bg-brand-primary text-white shadow-sm"
              : "border-dashed border-border bg-background text-muted-foreground",
          )}
        >
          <SelectedIcon className="size-7" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {value ? "Selected icon" : "No icon selected"}
          </p>
          {value ? (
            <>
              <p className="truncate text-base font-semibold text-foreground">
                {selectedLabel}
              </p>
              <p className="text-xs text-muted-foreground">
                {selected
                  ? `${selected.group} · shown when the category has no cover photo`
                  : "Not in the icon library — pick a new one below"}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click an icon below. Without one, the default folder icon is used.
            </p>
          )}
        </div>
        {value ? (
          <div className="flex flex-wrap gap-2">
            {selected ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={showSelected}
              >
                <LocateFixed className="size-3.5" />
                Show in list
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onChange(null)}
            >
              <X className="size-3.5" />
              Remove icon
            </Button>
          </div>
        ) : null}
      </div>

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

        {selectedHidden && selected ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            <span>
              Your selected icon “{selected.label}” is hidden by this search or
              filter.
            </span>
            <button
              type="button"
              className="font-medium underline underline-offset-2"
              onClick={showSelected}
            >
              Show it
            </button>
          </div>
        ) : null}

        <div ref={gridRef} className="relative max-h-[320px] overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No icons match “{query}”.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
              {filtered.map((item) => {
                const active = value === item.name;
                const Icon = item.Icon;
                return (
                  <button
                    key={item.name}
                    data-icon={item.name}
                    type="button"
                    title={item.label}
                    aria-pressed={active}
                    disabled={disabled}
                    onClick={() => onChange(item.name)}
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-1.5 rounded-lg border px-1 py-2.5 transition-all",
                      active
                        ? "border-brand-primary bg-brand-primary text-white shadow-sm ring-2 ring-brand-primary/30"
                        : "border-transparent bg-muted/40 text-muted-foreground hover:border-brand-primary/40 hover:bg-brand-tint hover:text-brand-deep",
                    )}
                  >
                    <Icon className="size-5" strokeWidth={1.75} />
                    <span className="w-full truncate text-center text-[10px] leading-tight font-medium">
                      {item.label}
                    </span>
                    {active ? (
                      <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-white text-brand-primary">
                        <Check className="size-3" strokeWidth={3} />
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
          {selectedLabel ? (
            <>
              {" "}
              · Selected:{" "}
              <span className="font-medium text-foreground">{selectedLabel}</span>
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
