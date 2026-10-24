"use client";

import { useEffect, useRef } from "react";
import { useI18n } from "@/components/providers/LocaleProvider";
import ShopProductCard from "./ShopProductCard";
import { VIEW_MODE_GRID_CLASS, type ShopProduct, type ShopViewMode } from "./types";

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
                if (entries.some((entry) => entry.isIntersecting)) onNearEnd();
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
                <p className="py-4 text-center text-sm text-text-secondary">{copy.loadingMore}</p>
            ) : null}
            {error ? (
                <p className="py-4 text-center text-sm text-error">
                    {copy.loadFailed}{" "}
                    <button
                        type="button"
                        onClick={onRetry}
                        className="font-semibold text-brand-primary"
                    >
                        {copy.retry}
                    </button>
                </p>
            ) : null}
            {showStatus && !hasMore && products.length > 0 && !loadingMore ? (
                <p className="py-4 text-center text-sm text-text-secondary">{copy.endOfList}</p>
            ) : null}
        </div>
    );
}
