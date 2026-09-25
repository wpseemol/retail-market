"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { SHOP_COLORS } from "./data";
import type { ShopFacetOption } from "./ShopPageContent";
import { formatPrice } from "@/lib/money";

interface ShopSidebarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  priceMin: number;
  priceMax: number;
  priceRange: { min: number; max: number };
  onPriceChange: (min: number, max: number) => void;
  selectedColor: string | null;
  onColorChange: (colorId: string | null) => void;
  showColorFilter?: boolean;
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  selectedBrands: string[];
  onBrandToggle: (brandId: string) => void;
  selectedTag: string | null;
  onTagChange: (tag: string | null) => void;
  categories: ShopFacetOption[];
  brands: ShopFacetOption[];
  tags: string[];
  categoriesVisible?: number;
  brandsVisible?: number;
  seeAllLabel?: string;
  showLessLabel?: string;
}

function FilterTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[16px] font-semibold text-text-primary mb-3.5 tracking-tight">
      {children}
    </h3>
  );
}

function priceStep(min: number, max: number) {
  const span = Math.max(1, max - min);
  if (span <= 100) return 1;
  if (span <= 1_000) return 10;
  if (span <= 10_000) return 50;
  if (span <= 100_000) return 100;
  return 500;
}

function FacetToggle({
  expanded,
  hiddenCount,
  seeAllLabel,
  showLessLabel,
  onToggle,
}: {
  expanded: boolean;
  hiddenCount: number;
  seeAllLabel: string;
  showLessLabel: string;
  onToggle: () => void;
}) {
  if (hiddenCount <= 0) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-2 text-[13px] font-medium text-brand-primary hover:text-brand-hover cursor-pointer"
      aria-expanded={expanded}
    >
      {expanded ? showLessLabel : `${seeAllLabel} (${hiddenCount})`}
    </button>
  );
}

export default function ShopSidebar({
  searchQuery,
  onSearchChange,
  priceMin,
  priceMax,
  priceRange,
  onPriceChange,
  selectedColor,
  onColorChange,
  showColorFilter = true,
  selectedCategory,
  onCategoryChange,
  selectedBrands,
  onBrandToggle,
  selectedTag,
  onTagChange,
  categories,
  brands,
  tags,
  categoriesVisible = 5,
  brandsVisible = 6,
  seeAllLabel = "See all",
  showLessLabel = "Show less",
}: ShopSidebarProps) {
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [brandsExpanded, setBrandsExpanded] = useState(false);

  const span = Math.max(1, priceRange.max - priceRange.min);
  const leftPercent = ((priceMin - priceRange.min) / span) * 100;
  const rightPercent = ((priceMax - priceRange.min) / span) * 100;
  const step = priceStep(priceRange.min, priceRange.max);
  const minGap = Math.max(step, 1);

  const catLimit = Math.max(1, categoriesVisible);
  const brandLimit = Math.max(1, brandsVisible);
  const visibleCategories = categoriesExpanded
    ? categories
    : categories.slice(0, catLimit);
  const visibleBrands = brandsExpanded ? brands : brands.slice(0, brandLimit);
  const hiddenCategoryCount = Math.max(0, categories.length - catLimit);
  const hiddenBrandCount = Math.max(0, brands.length - brandLimit);

  const handleMinChange = (value: number) => {
    const next = Math.min(value, priceMax - minGap);
    onPriceChange(Math.max(priceRange.min, next), priceMax);
  };

  const handleMaxChange = (value: number) => {
    const next = Math.max(value, priceMin + minGap);
    onPriceChange(priceMin, Math.min(priceRange.max, next));
  };

  return (
    <aside
      aria-label="Shop filters"
      className="w-full lg:w-[280px] xl:w-[300px] shrink-0 flex flex-col gap-7 lg:sticky lg:top-28 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1 scrollbar-thin"
    >
      <section>
        <FilterTitle>Search</FilterTitle>
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="flex items-center gap-2 border border-border-default rounded-md bg-bg-surface px-3 py-2.5 shadow-sm focus-within:border-brand-primary"
        >
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products..."
            className="w-full bg-transparent outline-none text-[14px] text-text-primary placeholder:text-text-secondary"
            aria-label="Search products"
            autoComplete="off"
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

      <section>
        <FilterTitle>Price Filtering</FilterTitle>
        <div className="relative h-7 flex items-center mb-3">
          <div className="absolute inset-x-0 h-1 rounded-full bg-border-default" />
          <div
            className="absolute h-1 rounded-full bg-brand-primary pointer-events-none"
            style={{
              left: `${leftPercent}%`,
              width: `${Math.max(0, rightPercent - leftPercent)}%`,
            }}
          />
          <input
            type="range"
            min={priceRange.min}
            max={priceRange.max}
            step={step}
            value={priceMin}
            onChange={(e) => handleMinChange(Number(e.target.value))}
            aria-label="Minimum price"
            className="shop-range absolute inset-x-0 w-full appearance-none bg-transparent z-10"
            style={{ zIndex: priceMin > priceRange.max - span * 0.5 ? 30 : 20 }}
          />
          <input
            type="range"
            min={priceRange.min}
            max={priceRange.max}
            step={step}
            value={priceMax}
            onChange={(e) => handleMaxChange(Number(e.target.value))}
            aria-label="Maximum price"
            className="shop-range absolute inset-x-0 w-full appearance-none bg-transparent z-20"
            style={{ zIndex: priceMax < priceRange.min + span * 0.5 ? 30 : 25 }}
          />
        </div>
        <div className="flex items-center justify-between gap-2 text-[13px]">
          <label className="flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-text-secondary text-[12px]">Min</span>
            <input
              type="number"
              min={priceRange.min}
              max={priceMax - minGap}
              step={step}
              value={priceMin}
              onChange={(e) =>
                handleMinChange(Number(e.target.value) || priceRange.min)
              }
              className="w-full rounded-md border border-border-default bg-bg-surface px-2 py-1.5 text-text-primary outline-none focus:border-brand-primary tabular-nums"
              aria-label="Minimum price amount"
            />
          </label>
          <span className="text-text-secondary pt-5 shrink-0">—</span>
          <label className="flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-text-secondary text-[12px]">Max</span>
            <input
              type="number"
              min={priceMin + minGap}
              max={priceRange.max}
              step={step}
              value={priceMax}
              onChange={(e) =>
                handleMaxChange(Number(e.target.value) || priceRange.max)
              }
              className="w-full rounded-md border border-border-default bg-bg-surface px-2 py-1.5 text-text-primary outline-none focus:border-brand-primary tabular-nums"
              aria-label="Maximum price amount"
            />
          </label>
        </div>
        <p className="text-[13px] text-text-secondary mt-2 m-0">
          {formatPrice(priceMin)} — {formatPrice(priceMax)}
        </p>
      </section>

      {showColorFilter ? (
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
                  onClick={() => onColorChange(isActive ? null : color.id)}
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
      ) : null}

      <section>
        <FilterTitle>Category</FilterTitle>
        {categories.length === 0 ? (
          <p className="text-[13px] text-text-secondary m-0">No categories yet</p>
        ) : (
          <>
            <ul className="flex flex-col gap-2.5 list-none m-0 p-0">
              {visibleCategories.map((category) => {
                const isActive = selectedCategory === category.id;
                return (
                  <li key={category.id}>
                    <button
                      type="button"
                      onClick={() =>
                        onCategoryChange(isActive ? null : category.id)
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
            <FacetToggle
              expanded={categoriesExpanded}
              hiddenCount={hiddenCategoryCount}
              seeAllLabel={seeAllLabel}
              showLessLabel={showLessLabel}
              onToggle={() => setCategoriesExpanded((v) => !v)}
            />
          </>
        )}
      </section>

      <section>
        <FilterTitle>Brands</FilterTitle>
        {brands.length === 0 ? (
          <p className="text-[13px] text-text-secondary m-0">No brands yet</p>
        ) : (
          <>
            <ul className="flex flex-col gap-2.5 list-none m-0 p-0">
              {visibleBrands.map((brand) => {
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
            <FacetToggle
              expanded={brandsExpanded}
              hiddenCount={hiddenBrandCount}
              seeAllLabel={seeAllLabel}
              showLessLabel={showLessLabel}
              onToggle={() => setBrandsExpanded((v) => !v)}
            />
          </>
        )}
      </section>

      {tags.length > 0 ? (
        <section>
          <FilterTitle>Tags</FilterTitle>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const isActive = selectedTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onTagChange(isActive ? null : tag)}
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
      ) : null}
    </aside>
  );
}
