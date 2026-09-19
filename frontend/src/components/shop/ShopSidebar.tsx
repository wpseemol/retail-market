"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import {
    PRICE_RANGE,
    SHOP_BRANDS,
    SHOP_CATEGORIES,
    SHOP_COLORS,
    SHOP_TAGS,
} from "./data";

interface ShopSidebarProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    priceMin: number;
    priceMax: number;
    onPriceChange: (min: number, max: number) => void;
    selectedColor: string | null;
    onColorChange: (colorId: string | null) => void;
    selectedCategory: string | null;
    onCategoryChange: (categoryId: string | null) => void;
    selectedBrands: string[];
    onBrandToggle: (brandId: string) => void;
    selectedTag: string | null;
    onTagChange: (tag: string | null) => void;
}

function FilterTitle({ children }: { children: ReactNode }) {
    return (
        <h3 className="text-[16px] font-semibold text-text-primary mb-3.5 tracking-tight">
            {children}
        </h3>
    );
}

export default function ShopSidebar({
    searchQuery,
    onSearchChange,
    priceMin,
    priceMax,
    onPriceChange,
    selectedColor,
    onColorChange,
    selectedCategory,
    onCategoryChange,
    selectedBrands,
    onBrandToggle,
    selectedTag,
    onTagChange,
}: ShopSidebarProps) {
    const range = PRICE_RANGE.max - PRICE_RANGE.min;
    const leftPercent = ((priceMin - PRICE_RANGE.min) / range) * 100;
    const rightPercent = ((priceMax - PRICE_RANGE.min) / range) * 100;

    const handleMinChange = (value: number) => {
        const next = Math.min(value, priceMax - 1);
        onPriceChange(Math.max(PRICE_RANGE.min, next), priceMax);
    };

    const handleMaxChange = (value: number) => {
        const next = Math.max(value, priceMin + 1);
        onPriceChange(priceMin, Math.min(PRICE_RANGE.max, next));
    };

    return (
        <aside
            aria-label="Shop filters"
            className="w-full lg:w-[280px] xl:w-[300px] shrink-0 flex flex-col gap-7 lg:sticky lg:top-28 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1 scrollbar-thin"
        >
            {/* Search — stays pinned while the filter column scrolls */}
            <section className="lg:sticky lg:top-0 lg:z-10 lg:bg-bg-base lg:pb-4 lg:-mt-1 lg:pt-1">
                <FilterTitle>Search</FilterTitle>
                <form
                    role="search"
                    onSubmit={(e) => e.preventDefault()}
                    className="flex items-center gap-2 border border-border-default rounded-md bg-bg-surface px-3 py-2.5 shadow-sm"
                >
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search..."
                        className="w-full bg-transparent outline-none text-[14px] text-text-primary placeholder:text-text-secondary"
                        aria-label="Search products"
                    />
                    <Image
                        src="/icons/search.svg"
                        alt=""
                        width={16}
                        height={16}
                        aria-hidden="true"
                        className="opacity-60 shrink-0"
                    />
                </form>
            </section>

            {/* Price Filtering */}
            <section>
                <FilterTitle>Price Filtering</FilterTitle>
                <div className="relative h-6 flex items-center mb-3">
                    <div className="absolute inset-x-0 h-1 rounded-full bg-border-default" />
                    <div
                        className="absolute h-1 rounded-full bg-brand-primary"
                        style={{
                            left: `${leftPercent}%`,
                            width: `${rightPercent - leftPercent}%`,
                        }}
                    />
                    <input
                        type="range"
                        min={PRICE_RANGE.min}
                        max={PRICE_RANGE.max}
                        value={priceMin}
                        onChange={(e) =>
                            handleMinChange(Number(e.target.value))
                        }
                        aria-label="Minimum price"
                        className="shop-range absolute inset-x-0 w-full appearance-none bg-transparent pointer-events-none z-10"
                    />
                    <input
                        type="range"
                        min={PRICE_RANGE.min}
                        max={PRICE_RANGE.max}
                        value={priceMax}
                        onChange={(e) =>
                            handleMaxChange(Number(e.target.value))
                        }
                        aria-label="Maximum price"
                        className="shop-range absolute inset-x-0 w-full appearance-none bg-transparent pointer-events-none z-20"
                    />
                </div>
                <p className="text-[14px] text-text-secondary">
                    Price:{" "}
                    <span className="text-text-primary font-medium">
                        ${priceMin} — ${priceMax}
                    </span>
                </p>
            </section>

            {/* Color */}
            <section>
                <FilterTitle>Color</FilterTitle>
                <div className="flex flex-wrap gap-2.5">
                    {SHOP_COLORS.map((color) => {
                        const isActive = selectedColor === color.id;
                        return (
                            <button
                                key={color.id}
                                type="button"
                                aria-label={`Filter by ${color.label}`}
                                aria-pressed={isActive}
                                onClick={() =>
                                    onColorChange(isActive ? null : color.id)
                                }
                                className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer ${
                                    isActive
                                        ? "border-brand-primary ring-2 ring-brand-primary/30"
                                        : "border-transparent"
                                }`}
                                style={{ backgroundColor: color.value }}
                            />
                        );
                    })}
                </div>
            </section>

            {/* Category */}
            <section>
                <FilterTitle>Category</FilterTitle>
                <ul className="flex flex-col gap-2.5 list-none m-0 p-0">
                    {SHOP_CATEGORIES.map((category) => {
                        const isActive = selectedCategory === category.id;
                        return (
                            <li key={category.id}>
                                <button
                                    type="button"
                                    onClick={() =>
                                        onCategoryChange(
                                            isActive ? null : category.id,
                                        )
                                    }
                                    className={`w-full flex items-center justify-between text-[14px] transition-colors cursor-pointer text-left ${
                                        isActive
                                            ? "text-brand-primary font-medium"
                                            : "text-text-secondary hover:text-brand-primary"
                                    }`}
                                >
                                    <span>{category.label}</span>
                                    <span className="text-text-secondary">
                                        ({category.count})
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </section>

            {/* Brands */}
            <section>
                <FilterTitle>Brands</FilterTitle>
                <ul className="flex flex-col gap-2.5 list-none m-0 p-0">
                    {SHOP_BRANDS.map((brand) => {
                        const checked = selectedBrands.includes(brand.id);
                        return (
                            <li key={brand.id}>
                                <label className="flex items-center gap-2.5 text-[14px] text-text-secondary hover:text-text-primary cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => onBrandToggle(brand.id)}
                                        className="h-4 w-4 rounded border-border-default accent-brand-primary cursor-pointer"
                                    />
                                    <span className="flex-1">{brand.label}</span>
                                    <span>({brand.count})</span>
                                </label>
                            </li>
                        );
                    })}
                </ul>
            </section>

            {/* Tags */}
            <section>
                <FilterTitle>Tags</FilterTitle>
                <div className="flex flex-wrap gap-2">
                    {SHOP_TAGS.map((tag) => {
                        const isActive = selectedTag === tag;
                        return (
                            <button
                                key={tag}
                                type="button"
                                onClick={() =>
                                    onTagChange(isActive ? null : tag)
                                }
                                className={`text-[12px] px-3 py-1.5 rounded border transition-colors cursor-pointer ${
                                    isActive
                                        ? "bg-brand-primary border-brand-primary text-white"
                                        : "bg-bg-subtle border-border-default text-text-secondary hover:border-brand-primary hover:text-brand-primary"
                                }`}
                            >
                                {tag}
                            </button>
                        );
                    })}
                </div>
            </section>
        </aside>
    );
}
