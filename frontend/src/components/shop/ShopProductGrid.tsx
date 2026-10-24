"use client";

import { useEffect, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useI18n } from "@/components/providers/LocaleProvider";
import ShopProductCard from "./ShopProductCard";
import { VIEW_MODE_GRID_CLASS, type ShopProduct, type ShopViewMode } from "./types";

function columnsFor(viewMode: ShopViewMode, width: number) {
    if (viewMode === "list") return 1;
    if (viewMode === "grid2") return width >= 768 ? 2 : 1;
    if (viewMode === "grid3") {
        if (width >= 1280) return 3;
        if (width >= 640) return 2;
        return 1;
    }
    if (width >= 1280) return 4;
    if (width >= 768) return 3;
    return 2;
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
    const parentRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(1200);
    const [scrollMargin, setScrollMargin] = useState(0);
    const columns = columnsFor(viewMode, width);
    const rowCount = Math.ceil(products.length / columns);

    useEffect(() => {
        const node = parentRef.current;
        if (!node) return;
        const measure = () => {
            setWidth(node.clientWidth);
            setScrollMargin(node.offsetTop);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        window.addEventListener("resize", measure);
        return () => {
            observer.disconnect();
            window.removeEventListener("resize", measure);
        };
    }, []);

    const virtualizer = useWindowVirtualizer({
        count: rowCount,
        estimateSize: () => (viewMode === "list" ? 176 : 420),
        overscan: 3,
        scrollMargin,
    });
    const virtualRows = virtualizer.getVirtualItems();
    const nearEndIndex = virtualRows.at(-1)?.index ?? -1;

    useEffect(() => {
        if (!onNearEnd || !hasMore || rowCount === 0) return;
        if (nearEndIndex >= rowCount - 2) onNearEnd();
    }, [hasMore, nearEndIndex, onNearEnd, rowCount]);

    useEffect(() => {
        if (restoreScrollY == null || restoreScrollY <= 0) return;
        const frame = window.requestAnimationFrame(() => {
            window.scrollTo({ top: restoreScrollY });
        });
        return () => window.cancelAnimationFrame(frame);
    }, [restoreScrollY]);

    return (
        <div ref={parentRef}>
            <div
                className="relative w-full"
                style={{ height: virtualizer.getTotalSize() }}
            >
                {virtualRows.map((row) => {
                    const start = row.index * columns;
                    const slice = products.slice(start, start + columns);
                    return (
                        <div
                            key={row.key}
                            data-index={row.index}
                            ref={virtualizer.measureElement}
                            className="absolute left-0 top-0 w-full pb-4"
                            style={{
                                transform: `translateY(${row.start - scrollMargin}px)`,
                            }}
                        >
                            <div
                                className={
                                    viewMode === "list"
                                        ? "flex flex-col"
                                        : VIEW_MODE_GRID_CLASS[viewMode]
                                }
                            >
                                {slice.map((product) => (
                                    <ShopProductCard
                                        key={product.id}
                                        product={product}
                                        viewMode={viewMode}
                                        onQuickView={onQuickView}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
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
