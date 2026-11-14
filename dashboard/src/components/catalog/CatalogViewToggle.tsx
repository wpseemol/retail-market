import type { ReactNode } from "react";
import type { CatalogViewMode } from "@/lib/catalogView";
import { isCatalogListView } from "@/lib/catalogView";
import { cn } from "@/lib/utils";

const VIEW_OPTIONS: {
  mode: CatalogViewMode;
  label: string;
  hideBelow?: "sm" | "md";
  icon: ReactNode;
}[] = [
  {
    mode: "grid4",
    label: "4 columns",
    hideBelow: "md",
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18" fill="currentColor" aria-hidden>
        <rect x="1" y="1" width="3.5" height="3.5" rx="0.5" />
        <rect x="5.5" y="1" width="3.5" height="3.5" rx="0.5" />
        <rect x="10" y="1" width="3.5" height="3.5" rx="0.5" />
        <rect x="14.5" y="1" width="2.5" height="3.5" rx="0.5" />
        <rect x="1" y="7" width="3.5" height="3.5" rx="0.5" />
        <rect x="5.5" y="7" width="3.5" height="3.5" rx="0.5" />
        <rect x="10" y="7" width="3.5" height="3.5" rx="0.5" />
        <rect x="14.5" y="7" width="2.5" height="3.5" rx="0.5" />
        <rect x="1" y="13" width="3.5" height="3.5" rx="0.5" />
        <rect x="5.5" y="13" width="3.5" height="3.5" rx="0.5" />
        <rect x="10" y="13" width="3.5" height="3.5" rx="0.5" />
        <rect x="14.5" y="13" width="2.5" height="3.5" rx="0.5" />
      </svg>
    ),
  },
  {
    mode: "grid3",
    label: "3 columns",
    hideBelow: "sm",
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18" fill="currentColor" aria-hidden>
        <rect x="1" y="1" width="4.5" height="4.5" rx="0.75" />
        <rect x="6.75" y="1" width="4.5" height="4.5" rx="0.75" />
        <rect x="12.5" y="1" width="4.5" height="4.5" rx="0.75" />
        <rect x="1" y="6.75" width="4.5" height="4.5" rx="0.75" />
        <rect x="6.75" y="6.75" width="4.5" height="4.5" rx="0.75" />
        <rect x="12.5" y="6.75" width="4.5" height="4.5" rx="0.75" />
        <rect x="1" y="12.5" width="4.5" height="4.5" rx="0.75" />
        <rect x="6.75" y="12.5" width="4.5" height="4.5" rx="0.75" />
        <rect x="12.5" y="12.5" width="4.5" height="4.5" rx="0.75" />
      </svg>
    ),
  },
  {
    mode: "grid2",
    label: "2 columns",
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18" fill="currentColor" aria-hidden>
        <rect x="1" y="1" width="7" height="7" rx="1" />
        <rect x="10" y="1" width="7" height="7" rx="1" />
        <rect x="1" y="10" width="7" height="7" rx="1" />
        <rect x="10" y="10" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    mode: "list",
    label: "List",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden
      >
        <path d="M1 3h16M1 9h16M1 15h16" />
      </svg>
    ),
  },
];

export function CatalogViewToggle({
  value,
  onChange,
  className,
}: {
  value: CatalogViewMode;
  onChange: (mode: CatalogViewMode) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Catalog layout"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5",
        className,
      )}
    >
      {VIEW_OPTIONS.map(({ mode, label, icon, hideBelow }) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            onClick={() => onChange(mode)}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-md transition-colors",
              hideBelow === "md" && "hidden md:inline-flex",
              hideBelow === "sm" && "hidden sm:inline-flex",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}

export const CATALOG_VIEW_GRID_CLASS: Record<
  Exclude<CatalogViewMode, "list">,
  string
> = {
  grid4: "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4",
  grid3: "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3",
  grid2: "grid grid-cols-1 gap-3 md:grid-cols-2",
};

/** Wrapper class for the items container based on view mode. */
export function catalogItemsClassName(viewMode: CatalogViewMode) {
  if (isCatalogListView(viewMode)) {
    return "flex flex-col gap-2";
  }
  return CATALOG_VIEW_GRID_CLASS[viewMode];
}

/** Shared list-row chrome for products / categories / brands. */
export function catalogItemClassName(
  viewMode: CatalogViewMode,
  extras?: string,
) {
  const isList = isCatalogListView(viewMode);
  return cn(
    "group rounded-xl border border-border bg-linear-to-br from-background to-muted/30 transition-shadow hover:border-brand-primary/30 hover:shadow-md",
    isList
      ? "grid grid-cols-1 items-center gap-3 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4"
      : viewMode === "grid2"
        ? "flex flex-col gap-3 p-4 sm:flex-row sm:items-start"
        : "flex flex-col gap-3 p-4",
    extras,
  );
}
