"use client";

import { SlidersHorizontal } from "lucide-react";
import { useI18n } from "@/components/providers/LocaleProvider";
import { cn } from "@/lib/utils";

type Props = {
  count: number;
  hidden?: boolean;
  onClick: () => void;
};

/** Floating bottom-center filter control — compact for phone thumbs. */
export default function ShopFilterFab({ count, hidden = false, onClick }: Props) {
  const { t } = useI18n();
  const copy = t.shopPage;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-40 flex justify-center px-3 transition-[opacity,transform] duration-300 ease-out lg:hidden",
        "bottom-[calc(4.25rem+env(safe-area-inset-bottom))]",
        hidden
          ? "translate-y-2 opacity-0"
          : "translate-y-0 opacity-100",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-hidden={hidden}
        tabIndex={hidden ? -1 : 0}
        className={cn(
          "pointer-events-auto inline-flex h-9 max-w-[min(100%,11.5rem)] items-center gap-1.5 rounded-full bg-brand-primary px-3.5 text-[12px] font-semibold leading-none text-white shadow-[0_6px_20px_rgba(0,0,0,0.22)]",
          "active:scale-[0.97] hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary",
          hidden && "pointer-events-none",
        )}
      >
        <SlidersHorizontal className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{copy.filters}</span>
        {count > 0 ? (
          <span className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-semibold text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>
    </div>
  );
}
