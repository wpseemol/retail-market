"use client";

import { useMemo, useState } from "react";
import {
    PRICE_RANGE,
    PRODUCTS_PER_PAGE,
    shopProducts,
} from "./data";
import QuickViewModal from "./QuickViewModal";
import ShopBreadcrumb from "./ShopBreadcrumb";
import ShopPagination from "./ShopPagination";
import ShopProductCard from "./ShopProductCard";
import ShopSidebar from "./ShopSidebar";
import ShopToolbar from "./ShopToolbar";
import type { ShopProduct, ShopSortOption, ShopViewMode } from "./types";

export default function ShopPageContent() {
    const [searchQuery, setSearchQuery] = useState("");
    const [priceMin, setPriceMin] = useState<number>(PRICE_RANGE.min);
    const [priceMax, setPriceMax] = useState<number>(PRICE_RANGE.max);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(
        null,
    );
    const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ShopViewMode>("grid");
    const [sortBy, setSortBy] = useState<ShopSortOption>("default");
    const [currentPage, setCurrentPage] = useState(1);
    const [quickViewProduct, setQuickViewProduct] =
        useState<ShopProduct | null>(null);

    const filteredProducts = useMemo(() => {
        let result = [...shopProducts];

        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            result = result.filter(
                (p) =>
                    p.name.toLowerCase().includes(q) ||
                    p.brand.toLowerCase().includes(q) ||
                    p.category.toLowerCase().includes(q),
            );
        }

        result = result.filter(
            (p) => p.priceMax >= priceMin && p.priceMin <= priceMax,
        );

        if (selectedColor) {
            result = result.filter((p) => p.colors.includes(selectedColor));
        }

        if (selectedCategory) {
            result = result.filter((p) => p.category === selectedCategory);
        }

        if (selectedBrands.length > 0) {
            result = result.filter((p) => selectedBrands.includes(p.brand));
        }

        if (selectedTag) {
            result = result.filter((p) => p.tags.includes(selectedTag));
        }

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
        searchQuery,
        priceMin,
        priceMax,
        selectedColor,
        selectedCategory,
        selectedBrands,
        selectedTag,
        sortBy,
    ]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE),
    );
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * PRODUCTS_PER_PAGE;
    const pageProducts = filteredProducts.slice(
        startIndex,
        startIndex + PRODUCTS_PER_PAGE,
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
                        />

                        <div className="flex-1 min-w-0">
                            <ShopToolbar
                                from={
                                    filteredProducts.length === 0
                                        ? 0
                                        : startIndex + 1
                                }
                                to={Math.min(
                                    startIndex + PRODUCTS_PER_PAGE,
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

                            {pageProducts.length === 0 ? (
                                <div className="py-20 text-center border border-dashed border-border-default rounded-lg bg-bg-surface">
                                    <p className="text-text-secondary text-[15px] m-0">
                                        No products match your filters.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchQuery("");
                                            setPriceMin(PRICE_RANGE.min);
                                            setPriceMax(PRICE_RANGE.max);
                                            setSelectedColor(null);
                                            setSelectedCategory(null);
                                            setSelectedBrands([]);
                                            setSelectedTag(null);
                                            resetPage();
                                        }}
                                        className="mt-4 text-brand-primary text-[14px] font-semibold hover:text-brand-hover cursor-pointer"
                                    >
                                        Clear all filters
                                    </button>
                                </div>
                            ) : (
                                <div
                                    className={
                                        viewMode === "grid"
                                            ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
                                            : "flex flex-col gap-4"
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
