"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { XIcon } from "lucide-react";
import { useI18n } from "@/components/providers/LocaleProvider";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

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
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      direction="right"
      shouldScaleBackground={false}
      repositionInputs={false}
    >
      <DrawerContent
        direction="right"
        showHandle={false}
        className="lg:hidden"
      >
        <DrawerHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pr-3">
          <div className="min-w-0">
            <DrawerTitle className="m-0 flex items-center gap-2">
              {copy.filters}
              {count > 0 ? (
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-brand-primary px-2 py-0.5 text-xs font-semibold text-white">
                  {count}
                </span>
              ) : null}
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              {copy.filters}
            </DrawerDescription>
          </div>
          <DrawerClose asChild>
            <button
              type="button"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-bg-subtle hover:text-text-primary"
            >
              <XIcon className="size-5" />
              <span className="sr-only">{copy.closeFilters}</span>
            </button>
          </DrawerClose>
        </DrawerHeader>

        <div
          ref={scrollRef}
          data-lenis-prevent
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 touch-pan-y [-webkit-overflow-scrolling:touch]"
        >
          {children}
        </div>

        <DrawerFooter>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-border-default px-3 text-[13px] font-semibold leading-none whitespace-nowrap text-text-primary"
          >
            {copy.clearAll}
          </button>
          <DrawerClose asChild>
            <button
              type="button"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand-primary px-3 text-[13px] font-semibold leading-none whitespace-nowrap text-white"
            >
              {copy.showProducts}
            </button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
