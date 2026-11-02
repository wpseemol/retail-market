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
    const scrollRef = useRef<HTMLDivElement>(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!open) return;

        const body = document.body;
        const html = document.documentElement;
        const previousBody = body.style.overflow;
        const previousHtml = html.style.overflow;
        body.style.overflow = "hidden";
        html.style.overflow = "hidden";

        closeRef.current?.focus();
        scrollRef.current?.scrollTo({ top: 0 });

        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onCloseRef.current();
        };
        window.addEventListener("keydown", onKey);

        return () => {
            body.style.overflow = previousBody;
            html.style.overflow = previousHtml;
            window.removeEventListener("keydown", onKey);
        };
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[90] lg:hidden">
            <button
                type="button"
                aria-label={copy.closeFilters}
                className="absolute inset-0 border-0 bg-overlay-scrim"
                onClick={onClose}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label={copy.filters}
                data-lenis-prevent
                className="absolute inset-x-0 bottom-0 flex h-[min(92dvh,820px)] max-h-[min(92dvh,820px)] flex-col overflow-hidden rounded-t-2xl bg-bg-surface shadow-2xl"
            >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border-default px-4 py-3">
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

                <div
                    ref={scrollRef}
                    data-lenis-prevent
                    className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 touch-pan-y [-webkit-overflow-scrolling:touch]"
                >
                    {children}
                </div>

                <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border-default bg-bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
                </div>
            </div>
        </div>
    );
}
