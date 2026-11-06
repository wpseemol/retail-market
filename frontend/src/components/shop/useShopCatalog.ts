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

function appendUnique(prev: ShopProduct[], next: ShopProduct[]) {
    const seen = new Set(prev.map((product) => product.id));
    return [...prev, ...next.filter((product) => !seen.has(product.id))];
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

    /** Bumped only when filters/sort/page-size change — invalidates in-flight filter fetches. */
    const filterGen = useRef(0);
    const keyRef = useRef(key);
    const argsRef = useRef(args);
    const pageRef = useRef(page);
    const totalPagesRef = useRef(totalPages);
    const loadingMoreRef = useRef(false);
    const modeRef = useRef(args.mode);

    useEffect(() => {
        argsRef.current = args;
        modeRef.current = args.mode;
    }, [args]);

    useEffect(() => {
        pageRef.current = page;
    }, [page]);

    useEffect(() => {
        totalPagesRef.current = totalPages;
    }, [totalPages]);

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

    const mapProducts = useCallback((data: ProductsListPayload) => {
        return (data.products ?? []).map((product) =>
            toShopProduct(product, argsRef.current.locale),
        );
    }, []);

    const applyPage = useCallback(
        (data: ProductsListPayload, replace: boolean, fallbackPage: number) => {
            const mapped = mapProducts(data);
            setProducts((prev) => (replace ? mapped : appendUnique(prev, mapped)));
            setTotal(data.pagination?.total ?? mapped.length);
            setTotalPages(Math.max(1, data.pagination?.total_pages ?? 1));
            setPage(data.pagination?.page ?? fallbackPage);
        },
        [mapProducts],
    );

    useEffect(() => {
        if (keyRef.current === key) return;
        keyRef.current = key;
        const gen = ++filterGen.current;
        loadingMoreRef.current = false;
        setLoadingMore(false);
        setLoading(true);
        setError(null);
        setRestoreScrollY(null);
        void fetchPage(1)
            .then((data) => {
                if (filterGen.current !== gen) return;
                applyPage(data, true, 1);
                if (argsRef.current.mode === "pages") {
                    const url = new URL(window.location.href);
                    if (url.searchParams.has("page")) {
                        url.searchParams.delete("page");
                        window.history.replaceState(window.history.state, "", url);
                    }
                }
            })
            .catch(() => {
                if (filterGen.current !== gen) return;
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
                if (filterGen.current === gen) setLoading(false);
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
        const gen = filterGen.current;
        loadingMoreRef.current = true;
        setLoadingMore(true);
        void (async () => {
            let latest = args.initialProducts;
            let pages = 1;
            let reportedTotal = args.initialTotal;
            let reportedPages = args.initialTotalPages;
            try {
                for (let next = 2; next <= saved.pages && next <= reportedPages; next += 1) {
                    if (cancelled || keyRef.current !== savedKey || filterGen.current !== gen) {
                        return;
                    }
                    try {
                        const data = await fetchPage(next);
                        if (cancelled || keyRef.current !== savedKey || filterGen.current !== gen) {
                            return;
                        }
                        const mapped = mapProducts(data);
                        latest = appendUnique(latest, mapped);
                        pages = data.pagination?.page ?? next;
                        reportedTotal = data.pagination?.total ?? reportedTotal;
                        reportedPages = Math.max(1, data.pagination?.total_pages ?? reportedPages);
                    } catch {
                        break;
                    }
                }
                if (cancelled || keyRef.current !== savedKey || filterGen.current !== gen) return;
                setProducts(latest);
                setPage(pages);
                setTotal(reportedTotal);
                setTotalPages(reportedPages);
                setRestoreScrollY(saved.scrollY);
            } finally {
                if (!cancelled && filterGen.current === gen) {
                    loadingMoreRef.current = false;
                    setLoadingMore(false);
                }
            }
        })();
        return () => {
            cancelled = true;
            loadingMoreRef.current = false;
            setLoadingMore(false);
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
                    JSON.stringify({ pages: pageRef.current, scrollY: window.scrollY }),
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
    }, [args.mode]);

    const goToPage = useCallback(
        (nextPage: number) => {
            if (modeRef.current !== "pages") return;
            const target = Math.min(Math.max(1, nextPage), totalPagesRef.current);
            if (target === pageRef.current) return;
            const gen = ++filterGen.current;
            setLoading(true);
            setError(null);
            void fetchPage(target)
                .then((data) => {
                    if (filterGen.current !== gen) return;
                    applyPage(data, true, target);
                    const url = new URL(window.location.href);
                    if (target <= 1) url.searchParams.delete("page");
                    else url.searchParams.set("page", String(target));
                    window.history.replaceState(window.history.state, "", url);
                })
                .catch(() => {
                    if (filterGen.current !== gen) return;
                    setError(
                        typeof navigator !== "undefined" && navigator.onLine === false
                            ? "offline"
                            : "load",
                    );
                })
                .finally(() => {
                    if (filterGen.current === gen) setLoading(false);
                });
        },
        [applyPage, fetchPage],
    );

    const loadMore = useCallback(() => {
        if (modeRef.current !== "infinite") return;
        if (loadingMoreRef.current) return;
        const currentPage = pageRef.current;
        const pages = totalPagesRef.current;
        if (currentPage >= pages) return;

        const next = currentPage + 1;
        const gen = filterGen.current;
        loadingMoreRef.current = true;
        setLoadingMore(true);
        setError(null);

        void fetchPage(next)
            .then((data) => {
                // Filter change while loading — drop this page.
                if (filterGen.current !== gen) return;
                // Another append may have moved us forward; only apply if still needed.
                if (pageRef.current >= next) return;
                const reported = data.pagination?.page ?? next;
                if (reported < next) return;
                applyPage(data, false, next);
            })
            .catch(() => {
                if (filterGen.current !== gen) return;
                setError(
                    typeof navigator !== "undefined" && navigator.onLine === false
                        ? "offline"
                        : "load",
                );
            })
            .finally(() => {
                // Always clear the in-flight lock for this attempt when still current filter.
                if (filterGen.current === gen) {
                    loadingMoreRef.current = false;
                    setLoadingMore(false);
                }
            });
    }, [applyPage, fetchPage]);

    const retry = useCallback(() => {
        if (modeRef.current === "infinite" && products.length > 0) loadMore();
        else goToPage(pageRef.current || 1);
    }, [goToPage, loadMore, products.length]);

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
