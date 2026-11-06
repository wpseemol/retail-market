"use client";

import { useEffect, useRef } from "react";
import { Loader2, Package } from "lucide-react";
import { useI18n } from "@/components/providers/LocaleProvider";
import ShopProductCard from "./ShopProductCard";
import { VIEW_MODE_GRID_CLASS, type ShopProduct, type ShopViewMode } from "./types";

function ProductLoadMoreStatus({ label }: { label: string }) {
    return (
        <div
            className="flex flex-col items-center justify-center gap-3 py-8"
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            <div className="relative flex size-14 items-center justify-center rounded-2xl border border-border-default bg-bg-surface shadow-sm">
                <Package className="size-6 text-brand-primary/80" aria-hidden="true" />
                <Loader2
                    className="absolute -right-1 -bottom-1 size-5 animate-spin text-brand-primary"
                    aria-hidden="true"
                />
            </div>
            <p className="m-0 text-sm text-text-secondary">{label}</p>
            <div
                className={
                    "grid w-full max-w-3xl grid-cols-2 gap-2.5 opacity-70 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4"
                }
                aria-hidden="true"
            >
                {Array.from({ length: 4 }, (_, index) => (
                    <div
                        key={index}
                        className="overflow-hidden rounded-lg border border-border-default bg-bg-surface"
                    >
                        <div className="aspect-square animate-pulse bg-bg-subtle" />
                        <div className="space-y-2 p-3">
                            <div className="h-3 w-3/4 animate-pulse rounded bg-bg-subtle" />
                            <div className="h-3 w-1/2 animate-pulse rounded bg-bg-subtle" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function ShopProductGrid({
    products,
    viewMode,
    onQuickView,
    onNearEnd,
    restoreScrollY,
    loadingMore,
    error,
    onRetry,
    hasMore,
    showStatus,
}: {
    products: ShopProduct[];
    viewMode: ShopViewMode;
    onQuickView: (product: ShopProduct) => void;
    onNearEnd?: () => void;
    restoreScrollY?: number | null;
    loadingMore?: boolean;
    error?: string | null;
    onRetry?: () => void;
    hasMore?: boolean;
    showStatus?: boolean;
}) {
    const { t } = useI18n();
    const copy = t.shopPage;
    const sentinelRef = useRef<HTMLDivElement>(null);
    const onNearEndRef = useRef(onNearEnd);
    onNearEndRef.current = onNearEnd;

    useEffect(() => {
        if (restoreScrollY == null || restoreScrollY <= 0) return;
        const frame = window.requestAnimationFrame(() => {
            window.scrollTo({ top: restoreScrollY });
        });
        return () => window.cancelAnimationFrame(frame);
    }, [restoreScrollY]);

    useEffect(() => {
        const node = sentinelRef.current;
        if (!node || !onNearEnd || !hasMore || loadingMore) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    onNearEndRef.current?.();
                }
            },
            { rootMargin: "720px 0px" },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [hasMore, loadingMore, onNearEnd, products.length]);

    return (
        <div>
            {/* Extra space under the last row so the hover buy panel is not covered by the footer. */}
            <div className={showStatus ? "pb-24" : undefined}>
                <div
                    className={
                        viewMode === "list"
                            ? "flex flex-col gap-4"
                            : VIEW_MODE_GRID_CLASS[viewMode]
                    }
                >
                    {products.map((product) => (
                        <ShopProductCard
                            key={product.id}
                            product={product}
                            viewMode={viewMode}
                            onQuickView={onQuickView}
                        />
                    ))}
                </div>
                {showStatus ? (
                    <div ref={sentinelRef} className="h-px w-full" aria-hidden />
                ) : null}
            </div>
            {showStatus && loadingMore ? (
                <ProductLoadMoreStatus label={copy.loadingMore} />
            ) : null}
            {error ? (
                <p className={`py-4 text-center text-sm ${error === "offline" ? "text-text-secondary" : "text-error"}`}>
                    {error === "offline" ? (
                        copy.offlineList
                    ) : (
                        <>
                            {copy.loadFailed}{" "}
                            <button
                                type="button"
                                onClick={onRetry}
                                className="font-semibold text-brand-primary"
                            >
                                {copy.retry}
                            </button>
                        </>
                    )}
                </p>
            ) : null}
            {showStatus && !hasMore && products.length > 0 && !loadingMore ? (
                <p className="py-4 text-center text-sm text-text-secondary">{copy.endOfList}</p>
            ) : null}
        </div>
    );
}
