import { LayoutGrid, List } from "lucide-react";
import type { CatalogViewMode } from "@/lib/catalogView";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/dashboard/page-shell";
import { cn } from "@/lib/utils";

const OPTIONS: {
  mode: CatalogViewMode;
  label: string;
  icon: typeof LayoutGrid;
}[] = [
  { mode: "grid", label: "Grid", icon: LayoutGrid },
  { mode: "list", label: "List", icon: List },
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
    <SegmentedControl
      aria-label="Catalog layout"
      className={cn("shrink-0", className)}
    >
      {OPTIONS.map(({ mode, label, icon: Icon }) => (
        <SegmentedControlItem
          key={mode}
          active={value === mode}
          onClick={() => onChange(mode)}
        >
          <span className="inline-flex items-center gap-1.5">
            <Icon className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
          </span>
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}

/** Wrapper class for the items container based on view mode. */
export function catalogItemsClassName(viewMode: CatalogViewMode) {
  return viewMode === "list"
    ? "flex flex-col gap-2"
    : "grid gap-3 sm:grid-cols-2 xl:grid-cols-3";
}
