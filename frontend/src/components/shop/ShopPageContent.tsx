"use client";

import { useMemo, useState } from "react";
import { PRODUCTS_PER_PAGE } from "./data";
import QuickViewModal from "./QuickViewModal";
import ShopBreadcrumb from "./ShopBreadcrumb";
import ShopPagination from "./ShopPagination";
import ShopProductCard from "./ShopProductCard";
import ShopSidebar from "./ShopSidebar";
import ShopToolbar from "./ShopToolbar";
import type { ShopProduct, ShopSortOption, ShopViewMode } from "./types";
import { VIEW_MODE_GRID_CLASS } from "./types";

export type ShopFacetOption = {
  id: string;
  label: string;
  count: number;
};

type ShopPageContentProps = {
  products: ShopProduct[];
  categories: ShopFacetOption[];
  brands: ShopFacetOption[];
  priceRange: { min: number; max: number };
  tags?: string[];
  defaultViewMode?: ShopViewMode;
  productsPerPage?: number;
  categoriesVisible?: number;
  brandsVisible?: number;
  seeAllLabel?: string;
  showLessLabel?: string;
};

function matchesSearch(product: ShopProduct, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    product.name,
    product.brand,
    product.category,
    product.description,
    product.sku,
    product.model,
    product.slug,
    ...(product.tags ?? []),
    ...(product.categoryLabels ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function matchesBrand(
  product: ShopProduct,
  selectedBrands: string[],
  brands: ShopFacetOption[],
) {
  if (selectedBrands.length === 0) return true;
  const brandSlug = product.brand.toLowerCase();
  const brandLabel = (product.model ?? "").toLowerCase();
  return selectedBrands.some((id) => {
    const facet = brands.find((b) => b.id === id);
    const idLower = id.toLowerCase();
    const labelLower = (facet?.label ?? "").toLowerCase();
    return (
      brandSlug === idLower ||
      brandLabel === idLower ||
      (labelLower &&
        (brandLabel === labelLower ||
          brandSlug === labelLower ||
          product.tags.some((t) => t.toLowerCase() === labelLower)))
    );
  });
}

function matchesCategory(
  product: ShopProduct,
  selectedCategory: string | null,
  categories: ShopFacetOption[],
) {
  if (!selectedCategory) return true;
  const facet = categories.find((c) => c.id === selectedCategory);
  const idLower = selectedCategory.toLowerCase();
  const labelLower = (facet?.label ?? "").toLowerCase();
  const cat = product.category.toLowerCase();
  return (
    cat === idLower ||
    (labelLower &&
      (cat === labelLower ||
        product.tags.some((t) => t.toLowerCase() === labelLower) ||
        product.categoryLabels?.some(
          (t) => t.toLowerCase() === labelLower,
        )))
  );
}

export default function ShopPageContent({
  products,
  categories,
  brands,
  priceRange,
  tags = [],
  defaultViewMode = "grid4",
  productsPerPage = PRODUCTS_PER_PAGE,
  categoriesVisible = 5,
  brandsVisible = 6,
  seeAllLabel = "See all",
  showLessLabel = "Show less",
}: ShopPageContentProps) {
  const rangeMin = Math.floor(priceRange.min || 0);
  const rangeMax = Math.max(
    Math.ceil(priceRange.max || 0),
    rangeMin + 1,
  );
  const perPage = Math.min(48, Math.max(4, productsPerPage || PRODUCTS_PER_PAGE));

  const [searchQuery, setSearchQuery] = useState("");
  const [priceMin, setPriceMin] = useState(rangeMin);
  const [priceMax, setPriceMax] = useState(rangeMax);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    null,
  );
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ShopViewMode>(defaultViewMode);
  const [sortBy, setSortBy] = useState<ShopSortOption>("default");
  const [currentPage, setCurrentPage] = useState(1);
  const [quickViewProduct, setQuickViewProduct] =
    useState<ShopProduct | null>(null);

  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      if (!matchesSearch(p, searchQuery)) return false;
      if (p.priceMin < priceMin || p.priceMin > priceMax) return false;
      if (selectedColor && !p.colors.includes(selectedColor)) return false;
      if (!matchesCategory(p, selectedCategory, categories)) return false;
      if (!matchesBrand(p, selectedBrands, brands)) return false;
      if (
        selectedTag &&
        !p.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase())
      ) {
        return false;
      }
      return true;
    });

    result = [...result];
    switch (sortBy) {
      case "price-asc":
        result.sort((a, b) => a.priceMin - b.priceMin);
        break;
      case "price-desc":
        result.sort((a, b) => b.priceMin - a.priceMin);
        break;
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "rating-desc":
        result.sort((a, b) => b.rating - a.rating);
        break;
      default:
        break;
    }

    return result;
  }, [
    products,
    searchQuery,
    priceMin,
    priceMax,
    selectedColor,
    selectedCategory,
    selectedBrands,
    selectedTag,
    sortBy,
    categories,
    brands,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / perPage),
  );
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * perPage;
  const pageProducts = filteredProducts.slice(
    startIndex,
    startIndex + perPage,
  );

  const resetPage = () => setCurrentPage(1);

  const handleBrandToggle = (brandId: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandId)
        ? prev.filter((id) => id !== brandId)
        : [...prev, brandId],
    );
    resetPage();
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
    resetPage();
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
              onSearchChange={(value) => {
                setSearchQuery(value);
                resetPage();
              }}
              priceMin={priceMin}
              priceMax={priceMax}
              priceRange={{ min: rangeMin, max: rangeMax }}
              onPriceChange={(min, max) => {
                setPriceMin(min);
                setPriceMax(max);
                resetPage();
              }}
              selectedColor={selectedColor}
              onColorChange={(color) => {
                setSelectedColor(color);
                resetPage();
              }}
              showColorFilter={hasColorData}
              selectedCategory={selectedCategory}
              onCategoryChange={(category) => {
                setSelectedCategory(category);
                resetPage();
              }}
              selectedBrands={selectedBrands}
              onBrandToggle={handleBrandToggle}
              selectedTag={selectedTag}
              onTagChange={(tag) => {
                setSelectedTag(tag);
                resetPage();
              }}
              categories={categories}
              brands={brands}
              tags={tags}
              categoriesVisible={categoriesVisible}
              brandsVisible={brandsVisible}
              seeAllLabel={seeAllLabel}
              showLessLabel={showLessLabel}
            />

            <div className="flex-1 min-w-0">
              <ShopToolbar
                from={
                  filteredProducts.length === 0 ? 0 : startIndex + 1
                }
                to={Math.min(
                  startIndex + perPage,
                  filteredProducts.length,
                )}
                total={filteredProducts.length}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                sortBy={sortBy}
                onSortChange={(sort) => {
                  setSortBy(sort);
                  resetPage();
                }}
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

              {pageProducts.length === 0 ? (
                <div className="py-20 text-center border border-dashed border-border-default rounded-lg bg-bg-surface">
                  <p className="text-text-secondary text-[15px] m-0">
                    {products.length === 0
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
                <div
                  className={
                    viewMode === "list"
                      ? "flex flex-col gap-4"
                      : VIEW_MODE_GRID_CLASS[viewMode]
                  }
                >
                  {pageProducts.map((product) => (
                    <ShopProductCard
                      key={product.id}
                      product={product}
                      viewMode={viewMode}
                      onQuickView={setQuickViewProduct}
                    />
                  ))}
                </div>
              )}

              <ShopPagination
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        </div>
      </section>

      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </>
  );
}
