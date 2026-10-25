"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import { apiFetch } from "@/lib/api";
import {
    productListPath,
    toShopProduct,
    type ProductsListPayload,
} from "@/lib/products";
import type { ShopProduct, ShopSortOption } from "./types";

export type ShopPaginationMode = "pages" | "infinite";

const RESTORE_PAGE_CAP = 8;

type CatalogArgs = {
    initialProducts: ShopProduct[];
    initialPage: number;
    initialTotal: number;
    initialTotalPages: number;
    mode: ShopPaginationMode;
    perPage: number;
    search: string;
    category: string | null;
    brands: string[];
    sort: ShopSortOption;
    priceMin: number;
    priceMax: number;
    priceBounds: { min: number; max: number };
    locale: Locale;
};

function apiSort(sort: ShopSortOption) {
    return sort === "rating-desc" ? "default" : sort;
}

function catalogKey(args: CatalogArgs) {
    const price =
        args.priceMin > args.priceBounds.min || args.priceMax < args.priceBounds.max
            ? `${args.priceMin}-${args.priceMax}`
            : "";
    return [
        args.mode,
        args.perPage,
        args.search.trim(),
        args.category ?? "",
        [...args.brands].sort().join(","),
        apiSort(args.sort),
        price,
    ].join("|");
}

function readRestore(key: string) {
    if (typeof window === "undefined") return null;
    try {
        const raw = sessionStorage.getItem(`shop-infinite:${key}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { pages?: number; scrollY?: number };
        const pages = Math.min(
            RESTORE_PAGE_CAP,
            Math.max(1, Math.floor(Number(parsed.pages) || 1)),
        );
        const scrollY = Math.max(0, Number(parsed.scrollY) || 0);
        return pages > 1 || scrollY > 0 ? { pages, scrollY } : null;
    } catch {
        return null;
    }
}

export function useShopCatalog(args: CatalogArgs) {
    const key = catalogKey(args);
    const [products, setProducts] = useState(args.initialProducts);
    const [page, setPage] = useState(args.initialPage);
    const [total, setTotal] = useState(args.initialTotal);
    const [totalPages, setTotalPages] = useState(args.initialTotalPages);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [restoreScrollY, setRestoreScrollY] = useState<number | null>(null);
    const requestId = useRef(0);
    const keyRef = useRef(key);
    const argsRef = useRef(args);
    argsRef.current = args;

    const fetchPage = useCallback(async (nextPage: number) => {
        const current = argsRef.current;
        const priced =
            current.priceMin > current.priceBounds.min ||
            current.priceMax < current.priceBounds.max;
        return apiFetch<ProductsListPayload>(
            productListPath({
                page: nextPage,
                limit: current.perPage,
                q: current.search,
                category: current.category ?? undefined,
                brands: current.brands,
                sort: apiSort(current.sort),
                ...(priced
                    ? { minPrice: current.priceMin, maxPrice: current.priceMax }
                    : {}),
            }),
        );
    }, []);

    const applyPage = useCallback((data: ProductsListPayload, replace: boolean) => {
        const mapped = (data.products ?? []).map((product) =>
            toShopProduct(product, argsRef.current.locale),
        );
        setProducts((prev) => {
            if (replace) return mapped;
            const seen = new Set(prev.map((product) => product.id));
            return [...prev, ...mapped.filter((product) => !seen.has(product.id))];
        });
        setTotal(data.pagination?.total ?? mapped.length);
        setTotalPages(Math.max(1, data.pagination?.total_pages ?? 1));
        setPage(data.pagination?.page ?? 1);
    }, []);

    useEffect(() => {
        if (keyRef.current === key) return;
        keyRef.current = key;
        const id = ++requestId.current;
        setLoading(true);
        setError(null);
        setRestoreScrollY(null);
        void fetchPage(1)
            .then((data) => {
                if (requestId.current !== id) return;
                applyPage(data, true);
                if (argsRef.current.mode === "pages") {
                    const url = new URL(window.location.href);
                    if (url.searchParams.has("page")) {
                        url.searchParams.delete("page");
                        window.history.replaceState(window.history.state, "", url);
                    }
                }
            })
            .catch(() => {
                if (requestId.current !== id) return;
                if (typeof navigator !== "undefined" && navigator.onLine === false) {
                    setError("offline");
                    return;
                }
                setProducts([]);
                setTotal(0);
                setTotalPages(1);
                setPage(1);
                setError("load");
            })
            .finally(() => {
                if (requestId.current === id) setLoading(false);
            });
    }, [applyPage, fetchPage, key]);

    useEffect(() => {
        if (args.mode !== "infinite") return;
        const savedKey = keyRef.current;
        const saved = readRestore(savedKey);
        if (!saved || saved.pages <= 1) {
            if (saved?.scrollY) setRestoreScrollY(saved.scrollY);
            return;
        }
        let cancelled = false;
        setLoadingMore(true);
        void (async () => {
            let latest = args.initialProducts;
            let pages = 1;
            let reportedTotal = args.initialTotal;
            let reportedPages = args.initialTotalPages;
            for (let next = 2; next <= saved.pages && next <= reportedPages; next += 1) {
                if (cancelled || keyRef.current !== savedKey) return;
                try {
                    const data = await fetchPage(next);
                    if (cancelled || keyRef.current !== savedKey) return;
                    const mapped = (data.products ?? []).map((product) =>
                        toShopProduct(product, args.locale),
                    );
                    const seen = new Set(latest.map((product) => product.id));
                    latest = [...latest, ...mapped.filter((product) => !seen.has(product.id))];
                    pages = data.pagination?.page ?? next;
                    reportedTotal = data.pagination?.total ?? reportedTotal;
                    reportedPages = Math.max(1, data.pagination?.total_pages ?? reportedPages);
                } catch {
                    break;
                }
            }
            if (cancelled || keyRef.current !== savedKey) return;
            setProducts(latest);
            setPage(pages);
            setTotal(reportedTotal);
            setTotalPages(reportedPages);
            setRestoreScrollY(saved.scrollY);
            setLoadingMore(false);
        })();
        return () => {
            cancelled = true;
        };
        // Restore once for the first filter key. Later filter changes start from page 1.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (args.mode !== "infinite") return;
        let frame = 0;
        const save = () => {
            frame = 0;
            try {
                sessionStorage.setItem(
                    `shop-infinite:${keyRef.current}`,
                    JSON.stringify({ pages: page, scrollY: window.scrollY }),
                );
            } catch {
                /* private mode */
            }
        };
        const onScroll = () => {
            if (frame) return;
            frame = window.requestAnimationFrame(save);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", onScroll);
            if (frame) window.cancelAnimationFrame(frame);
            save();
        };
    }, [args.mode, page]);

    const goToPage = useCallback(
        (nextPage: number) => {
            if (args.mode !== "pages") return;
            const target = Math.min(Math.max(1, nextPage), totalPages);
            if (target === page) return;
            const id = ++requestId.current;
            setLoading(true);
            setError(null);
            void fetchPage(target)
                .then((data) => {
                    if (requestId.current !== id) return;
                    applyPage(data, true);
                    const url = new URL(window.location.href);
                    if (target <= 1) url.searchParams.delete("page");
                    else url.searchParams.set("page", String(target));
                    window.history.replaceState(window.history.state, "", url);
                })
                .catch(() => {
                    if (requestId.current !== id) return;
                    setError(typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "load");
                })
                .finally(() => {
                    if (requestId.current === id) setLoading(false);
                });
        },
        [applyPage, args.mode, fetchPage, page, totalPages],
    );

    const loadMore = useCallback(() => {
        if (args.mode !== "infinite" || loading || loadingMore || page >= totalPages) return;
        const id = ++requestId.current;
        setLoadingMore(true);
        setError(null);
        void fetchPage(page + 1)
            .then((data) => {
                if (requestId.current !== id) return;
                const nextPage = data.pagination?.page ?? page + 1;
                if (nextPage <= page) return;
                applyPage(data, false);
            })
            .catch(() => {
                if (requestId.current !== id) return;
                setError(typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "load");
            })
            .finally(() => {
                if (requestId.current === id) setLoadingMore(false);
            });
    }, [args.mode, fetchPage, loading, loadingMore, page, totalPages]);

    const retry = useCallback(() => {
        if (args.mode === "infinite" && products.length > 0) loadMore();
        else goToPage(page || 1);
    }, [args.mode, goToPage, loadMore, page, products.length]);

    return {
        products,
        page,
        total,
        totalPages,
        loading,
        loadingMore,
        error,
        restoreScrollY,
        goToPage,
        loadMore,
        retry,
    };
}
