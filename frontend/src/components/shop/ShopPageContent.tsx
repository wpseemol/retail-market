"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import { usePriceRange } from "@/hooks/usePriceRange";
import { clampPerPage, PRODUCTS_PER_PAGE, perPageChoices } from "./data";
import QuickViewModal from "./QuickViewModal";
import ShopBreadcrumb from "./ShopBreadcrumb";
import ShopPagination from "./ShopPagination";
import ShopProductGrid from "./ShopProductGrid";
import ShopSidebar from "./ShopSidebar";
import ShopToolbar from "./ShopToolbar";
import type { ShopProduct, ShopSortOption, ShopViewMode } from "./types";
import { useShopCatalog, type ShopPaginationMode } from "./useShopCatalog";

export type ShopFacetOption = {
  id: string;
  label: string;
  label_bn?: string | null;
  count: number;
};

type ShopPageContentProps = {
  products: ShopProduct[];
  categories: ShopFacetOption[];
  brands: ShopFacetOption[];
  priceRange: { min: number; max: number };
  tags?: string[];
  defaultViewMode?: ShopViewMode;
  /** Dashboard default page size. */
  productsPerPage?: number;
  /** Shopper's choice from `?per_page=`; falls back to the default. */
  initialPerPage?: number | null;
  paginationMode?: ShopPaginationMode;
  initialPage?: number;
  initialTotal?: number;
  initialTotalPages?: number;
  locale?: Locale;
  categoriesVisible?: number;
  brandsVisible?: number;
  seeAllLabel?: string;
  showLessLabel?: string;
  initialSearch?: string;
  initialCategory?: string | null;
  /** Brand slug from `?brand=`; preselects that brand filter. */
  initialBrand?: string | null;
};

export default function ShopPageContent({
  products,
  categories,
  brands,
  priceRange,
  tags = [],
  defaultViewMode = "grid4",
  productsPerPage = PRODUCTS_PER_PAGE,
  initialPerPage = null,
  categoriesVisible = 5,
  brandsVisible = 6,
  seeAllLabel = "See all",
  showLessLabel = "Show less",
  initialSearch = "",
  initialCategory = null,
  initialBrand = null,
  paginationMode = "pages",
  initialPage = 1,
  initialTotal = 0,
  initialTotalPages = 1,
  locale = "en",
}: ShopPageContentProps) {
  const defaultPerPage = clampPerPage(productsPerPage);
  const perPageOptions = useMemo(() => perPageChoices(defaultPerPage), [defaultPerPage]);
  const [perPage, setPerPage] = useState(() =>
    initialPerPage && perPageOptions.includes(initialPerPage) ? initialPerPage : defaultPerPage,
  );

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialCategory,
  );
  const [selectedBrands, setSelectedBrands] = useState<string[]>(() => {
    if (!initialBrand) return [];
    const facet = brands.find(
      (b) => b.id.toLowerCase() === initialBrand || b.label.toLowerCase() === initialBrand,
    );
    return [facet?.id ?? initialBrand];
  });

  const { range: liveRange, loading: priceRangeLoading } = usePriceRange(
    { q: searchQuery, category: selectedCategory, brands: selectedBrands },
    priceRange,
  );
  const rangeMin = Math.floor(liveRange.min || 0);
  const rangeMax = Math.max(Math.ceil(liveRange.max || 0), rangeMin + 1);

  const [priceMin, setPriceMin] = useState(rangeMin);
  const [priceMax, setPriceMax] = useState(rangeMax);
  const [syncedRange, setSyncedRange] = useState({ min: rangeMin, max: rangeMax });

  // New bounds from the API: an untouched end follows the new bound, a dragged end is clamped into it.
  if (syncedRange.min !== rangeMin || syncedRange.max !== rangeMax) {
    let nextMin =
      priceMin <= syncedRange.min ? rangeMin : Math.min(Math.max(priceMin, rangeMin), rangeMax);
    let nextMax =
      priceMax >= syncedRange.max ? rangeMax : Math.min(Math.max(priceMax, rangeMin), rangeMax);
    if (nextMin >= nextMax) {
      nextMin = rangeMin;
      nextMax = rangeMax;
    }
    setSyncedRange({ min: rangeMin, max: rangeMax });
    setPriceMin(nextMin);
    setPriceMax(nextMax);
  }
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ShopViewMode>(defaultViewMode);
  const [sortBy, setSortBy] = useState<ShopSortOption>("default");
  const [quickViewProduct, setQuickViewProduct] =
    useState<ShopProduct | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [debouncedPrice, setDebouncedPrice] = useState({ min: priceMin, max: priceMax });
  const listRef = useRef<HTMLDivElement>(null);
  const lastScrolledPage = useRef(initialPage);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedPrice({ min: priceMin, max: priceMax }),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [priceMin, priceMax]);

  const catalog = useShopCatalog({
    initialProducts: products,
    initialPage,
    initialTotal: initialTotal || products.length,
    initialTotalPages,
    mode: paginationMode,
    perPage,
    search: debouncedSearch,
    category: selectedCategory,
    brands: selectedBrands,
    sort: sortBy,
    priceMin: debouncedPrice.min,
    priceMax: debouncedPrice.max,
    priceBounds: { min: rangeMin, max: rangeMax },
    locale,
  });

  const visibleProducts = useMemo(() => {
    const result = catalog.products.filter((product) => {
      if (selectedColor && !product.colors.includes(selectedColor)) return false;
      if (
        selectedTag &&
        !product.tags.some((tag) => tag.toLowerCase() === selectedTag.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
    if (sortBy !== "rating-desc") return result;
    return [...result].sort((a, b) => b.rating - a.rating);
  }, [catalog.products, selectedColor, selectedTag, sortBy]);

  useEffect(() => {
    if (paginationMode !== "pages" || lastScrolledPage.current === catalog.page) return;
    lastScrolledPage.current = catalog.page;
    listRef.current?.scrollIntoView({ block: "start" });
  }, [catalog.page, paginationMode]);

  const rangeStart =
    visibleProducts.length === 0
      ? 0
      : paginationMode === "infinite"
        ? 1
        : (catalog.page - 1) * perPage + 1;
  const rangeEnd =
    visibleProducts.length === 0
      ? 0
      : paginationMode === "infinite"
        ? visibleProducts.length
        : rangeStart + visibleProducts.length - 1;

  const handlePerPageChange = (next: number) => {
    if (!perPageOptions.includes(next) || next === perPage) return;
    setPerPage(next);
    const url = new URL(window.location.href);
    if (next === defaultPerPage) url.searchParams.delete("per_page");
    else url.searchParams.set("per_page", String(next));
    url.searchParams.delete("page");
    window.history.replaceState(window.history.state, "", url);
  };

  const handleBrandToggle = (brandId: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandId)
        ? prev.filter((id) => id !== brandId)
        : [...prev, brandId],
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setPriceMin(rangeMin);
    setPriceMax(rangeMax);
    setSelectedColor(null);
    setSelectedCategory(null);
    setSelectedBrands([]);
    setSelectedTag(null);
    setSortBy("default");
  };

  const hasColorData = products.some((p) => p.colors.length > 0);
  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    priceMin > rangeMin ||
    priceMax < rangeMax ||
    selectedColor != null ||
    selectedCategory != null ||
    selectedBrands.length > 0 ||
    selectedTag != null;

  return (
    <>
      <ShopBreadcrumb />

      <section
        aria-label="Shop products"
        className="w-full bg-bg-base py-8 sm:py-10 transition-colors duration-200"
      >
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row gap-8 xl:gap-10">
            <ShopSidebar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              priceMin={priceMin}
              priceMax={priceMax}
              priceRange={{ min: rangeMin, max: rangeMax }}
              priceRangeLoading={priceRangeLoading}
              onPriceChange={(min, max) => {
                setPriceMin(min);
                setPriceMax(max);
              }}
              selectedColor={selectedColor}
              onColorChange={setSelectedColor}
              showColorFilter={hasColorData}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              selectedBrands={selectedBrands}
              onBrandToggle={handleBrandToggle}
              selectedTag={selectedTag}
              onTagChange={setSelectedTag}
              categories={categories}
              brands={brands}
              tags={tags}
              categoriesVisible={categoriesVisible}
              brandsVisible={brandsVisible}
              seeAllLabel={seeAllLabel}
              showLessLabel={showLessLabel}
            />

            <div ref={listRef} className="flex-1 min-w-0">
              <ShopToolbar
                from={rangeStart}
                to={rangeEnd}
                total={catalog.total}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                sortBy={sortBy}
                onSortChange={setSortBy}
                perPage={perPage}
                perPageOptions={perPageOptions}
                onPerPageChange={handlePerPageChange}
                showPerPage={paginationMode === "pages"}
              />

              {hasActiveFilters ? (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-[13px] font-medium text-brand-primary hover:text-brand-hover cursor-pointer"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : null}

              {catalog.loading && visibleProducts.length === 0 ? (
                <p className="py-16 text-center text-sm text-text-secondary">Loading products…</p>
              ) : visibleProducts.length === 0 ? (
                <div className="py-20 text-center border border-dashed border-border-default rounded-lg bg-bg-surface">
                  <p className="text-text-secondary text-[15px] m-0">
                    {catalog.total === 0
                      ? "No products available yet."
                      : "No products match your filters."}
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 text-brand-primary text-[14px] font-semibold hover:text-brand-hover cursor-pointer"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <div className={catalog.loading ? "opacity-60" : undefined}>
                  <ShopProductGrid
                    products={visibleProducts}
                    viewMode={viewMode}
                    onQuickView={setQuickViewProduct}
                    onNearEnd={paginationMode === "infinite" ? catalog.loadMore : undefined}
                    restoreScrollY={catalog.restoreScrollY}
                    loadingMore={catalog.loadingMore}
                    error={catalog.error}
                    onRetry={catalog.retry}
                    hasMore={catalog.page < catalog.totalPages}
                    showStatus={paginationMode === "infinite"}
                  />
                </div>
              )}

              {paginationMode === "pages" ? (
                <ShopPagination
                  currentPage={catalog.page}
                  totalPages={catalog.totalPages}
                  onPageChange={catalog.goToPage}
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {quickViewProduct && (
        <QuickViewModal
          key={quickViewProduct.id}
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </>
  );
}
