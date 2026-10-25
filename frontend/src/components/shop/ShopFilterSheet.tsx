"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { XIcon } from "lucide-react";
import { useI18n } from "@/components/providers/LocaleProvider";

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
    const closeRef = useRef<HTMLButtonElement>(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!open) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        closeRef.current?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onCloseRef.current();
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener("keydown", onKey);
        };
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[90] lg:hidden">
            <button
                type="button"
                aria-label={copy.closeFilters}
                className="absolute inset-0 bg-overlay-scrim"
                onClick={onClose}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label={copy.filters}
                className="absolute inset-x-0 bottom-0 flex max-h-[min(92dvh,820px)] flex-col rounded-t-2xl bg-bg-surface shadow-2xl"
            >
                <div className="flex items-center justify-between gap-3 border-b border-border-default px-4 py-3">
                    <h2 className="m-0 flex items-center gap-2 text-[17px] font-semibold text-text-primary">
                        {copy.filters}
                        {count > 0 ? (
                            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-brand-primary px-2 py-0.5 text-[12px] font-semibold text-white">
                                {count}
                            </span>
                        ) : null}
                    </h2>
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        className="inline-flex size-11 items-center justify-center rounded-full text-text-secondary hover:bg-bg-subtle hover:text-text-primary"
                    >
                        <XIcon className="size-5" />
                        <span className="sr-only">{copy.closeFilters}</span>
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
                <div className="flex gap-2 border-t border-border-default px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    <button
                        type="button"
                        onClick={onClear}
                        className="min-h-11 flex-1 rounded-full border border-border-default px-4 text-[14px] font-semibold text-text-primary"
                    >
                        {copy.clearFilters}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-11 flex-[1.4] rounded-full bg-brand-primary px-4 text-[14px] font-semibold text-white"
                    >
                        {copy.showProducts}
                    </button>
                </div>
            </div>
        </div>
    );
}
