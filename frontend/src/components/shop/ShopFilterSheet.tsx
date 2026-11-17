"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { XIcon } from "lucide-react";
import { useI18n } from "@/components/providers/LocaleProvider";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export default function ShopFilterSheet({
  open,
  count,
  onClose,
  onClear,
  children,
}: {
  open: boolean;
  count: number;
  onClose: () => void;
  onClear: () => void;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const copy = t.shopPage;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: 0 });
  }, [open]);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        closeLabel={copy.closeFilters}
        className="gap-0 p-0 lg:hidden"
        aria-describedby={undefined}
      >
        <SheetHeader className="flex-row items-center justify-between gap-3 space-y-0 pr-3">
          <div className="min-w-0">
            <SheetTitle className="m-0 flex items-center gap-2 text-[17px]">
              {copy.filters}
              {count > 0 ? (
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-brand-primary px-2 py-0.5 text-xs font-semibold text-white">
                  {count}
                </span>
              ) : null}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {copy.filters}
            </SheetDescription>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-bg-subtle hover:text-text-primary"
          >
            <XIcon className="size-5" />
            <span className="sr-only">{copy.closeFilters}</span>
          </button>
        </SheetHeader>

        <div
          ref={scrollRef}
          data-lenis-prevent
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 touch-pan-y [-webkit-overflow-scrolling:touch]"
        >
          {children}
        </div>

        <SheetFooter className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-border-default px-3 text-[13px] font-semibold leading-none whitespace-nowrap text-text-primary"
          >
            {copy.clearAll}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand-primary px-3 text-[13px] font-semibold leading-none whitespace-nowrap text-white"
          >
            {copy.showProducts}
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
