"use client";

import { SlidersHorizontal } from "lucide-react";
import { useI18n } from "@/components/providers/LocaleProvider";
import { cn } from "@/lib/utils";

type Props = {
  count: number;
  hidden?: boolean;
  onClick: () => void;
};

/** Floating bottom-center filter control — mobile shop only. */
export default function ShopFilterFab({ count, hidden = false, onClick }: Props) {
  const { t } = useI18n();
  const copy = t.shopPage;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 transition-[opacity,transform] duration-300 ease-out lg:hidden",
        "bottom-[calc(4.75rem+env(safe-area-inset-bottom))]",
        hidden
          ? "translate-y-3 opacity-0"
          : "translate-y-0 opacity-100",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-hidden={hidden}
        tabIndex={hidden ? -1 : 0}
        className={cn(
          "pointer-events-auto inline-flex h-12 items-center gap-2 rounded-full bg-brand-primary px-5 text-sm font-semibold text-white shadow-[0_8px_28px_rgba(0,0,0,0.28)]",
          "hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary",
          hidden && "pointer-events-none",
        )}
      >
        <SlidersHorizontal className="size-4 shrink-0" aria-hidden />
        {copy.filters}
        {count > 0 ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {count}
          </span>
        ) : null}
      </button>
    </div>
  );
}
