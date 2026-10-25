"use client";

import type { ReactNode } from "react";
import { format } from "@/i18n/config";
import { useI18n } from "@/components/providers/LocaleProvider";
import type { ShopSortOption, ShopViewMode } from "./types";

interface ShopToolbarProps {
    from: number;
    to: number;
    total: number;
    viewMode: ShopViewMode;
    onViewModeChange: (mode: ShopViewMode) => void;
    sortBy: ShopSortOption;
    onSortChange: (sort: ShopSortOption) => void;
    perPage: number;
    perPageOptions: number[];
    onPerPageChange: (perPage: number) => void;
    /** Numbered pages let shoppers pick a page size. Infinite scroll does not. */
    showPerPage?: boolean;
}

function ChevronDown() {
    return (
        <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none stroke-text-secondary"
            aria-hidden="true"
        >
            <path d="M1 1L5 5L9 1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

const selectClass =
    "appearance-none bg-bg-surface border border-border-default rounded-md text-[13px] text-text-primary pl-3 pr-8 py-2 outline-none cursor-pointer hover:border-brand-primary focus:border-brand-primary transition-colors";

const VIEW_OPTIONS: {
    mode: ShopViewMode;
    className: string;
    icon: ReactNode;
}[] = [
    {
        mode: "grid4",
        className: "hidden md:inline-flex",
        icon: (
            <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="currentColor"
                aria-hidden="true"
            >
                <rect x="1" y="1" width="3.5" height="3.5" rx="0.5" />
                <rect x="5.5" y="1" width="3.5" height="3.5" rx="0.5" />
                <rect x="10" y="1" width="3.5" height="3.5" rx="0.5" />
                <rect x="14.5" y="1" width="2.5" height="3.5" rx="0.5" />
                <rect x="1" y="7" width="3.5" height="3.5" rx="0.5" />
                <rect x="5.5" y="7" width="3.5" height="3.5" rx="0.5" />
                <rect x="10" y="7" width="3.5" height="3.5" rx="0.5" />
                <rect x="14.5" y="7" width="2.5" height="3.5" rx="0.5" />
                <rect x="1" y="13" width="3.5" height="3.5" rx="0.5" />
                <rect x="5.5" y="13" width="3.5" height="3.5" rx="0.5" />
                <rect x="10" y="13" width="3.5" height="3.5" rx="0.5" />
                <rect x="14.5" y="13" width="2.5" height="3.5" rx="0.5" />
            </svg>
        ),
    },
    {
        mode: "grid3",
        className: "hidden sm:inline-flex",
        icon: (
            <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="currentColor"
                aria-hidden="true"
            >
                <rect x="1" y="1" width="4.5" height="4.5" rx="0.75" />
                <rect x="6.75" y="1" width="4.5" height="4.5" rx="0.75" />
                <rect x="12.5" y="1" width="4.5" height="4.5" rx="0.75" />
                <rect x="1" y="6.75" width="4.5" height="4.5" rx="0.75" />
                <rect x="6.75" y="6.75" width="4.5" height="4.5" rx="0.75" />
                <rect x="12.5" y="6.75" width="4.5" height="4.5" rx="0.75" />
                <rect x="1" y="12.5" width="4.5" height="4.5" rx="0.75" />
                <rect x="6.75" y="12.5" width="4.5" height="4.5" rx="0.75" />
                <rect x="12.5" y="12.5" width="4.5" height="4.5" rx="0.75" />
            </svg>
        ),
    },
    {
        mode: "grid2",
        className: "inline-flex",
        icon: (
            <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="currentColor"
                aria-hidden="true"
            >
                <rect x="1" y="1" width="7" height="7" rx="1" />
                <rect x="10" y="1" width="7" height="7" rx="1" />
                <rect x="1" y="10" width="7" height="7" rx="1" />
                <rect x="10" y="10" width="7" height="7" rx="1" />
            </svg>
        ),
    },
    {
        mode: "list",
        className: "inline-flex",
        icon: (
            <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
            >
                <path d="M1 3h16M1 9h16M1 15h16" />
            </svg>
        ),
    },
];

export default function ShopToolbar({
    from,
    to,
    total,
    viewMode,
    onViewModeChange,
    sortBy,
    onSortChange,
    perPage,
    perPageOptions,
    onPerPageChange,
    showPerPage = true,
}: ShopToolbarProps) {
    const { t } = useI18n();
    const copy = t.shopPage;
    const viewLabel: Record<ShopViewMode, string> = {
        grid4: copy.viewGrid4,
        grid3: copy.viewGrid3,
        grid2: copy.viewGrid2,
        list: copy.viewList,
    };
    const sortLabel: Record<ShopSortOption, string> = {
        default: copy.sortDefault,
        "price-asc": copy.sortPriceAsc,
        "price-desc": copy.sortPriceDesc,
        "name-asc": copy.sortName,
        "rating-desc": copy.sortRating,
    };

    return (
        <div className="mb-4 flex flex-col gap-3 border-b border-border-default pb-4 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="m-0 text-[13px] text-text-secondary sm:text-[14px]">
                {showPerPage
                    ? format(copy.showingResults, {
                          from: total === 0 ? 0 : from,
                          to,
                          total,
                      })
                    : format(copy.showingProducts, { shown: to, total })}
            </p>

            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-4">
                {showPerPage ? (
                    <label className="flex items-center gap-2 text-[13px] text-text-secondary">
                        {copy.show}
                        <span className="relative">
                            <select
                                value={perPage}
                                onChange={(e) => onPerPageChange(Number(e.target.value))}
                                aria-label={copy.perPage}
                                className={selectClass}
                            >
                                {perPageOptions.map((n) => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown />
                        </span>
                    </label>
                ) : null}

                <div
                    className="flex items-center gap-0.5 sm:gap-1"
                    role="group"
                    aria-label={copy.productLayout}
                >
                    {VIEW_OPTIONS.map((option) => {
                        const isActive = viewMode === option.mode;
                        const label = viewLabel[option.mode];
                        return (
                            <button
                                key={option.mode}
                                type="button"
                                aria-label={label}
                                aria-pressed={isActive}
                                title={label}
                                onClick={() => onViewModeChange(option.mode)}
                                className={`${option.className} min-h-9 min-w-9 items-center justify-center rounded p-1.5 transition-colors cursor-pointer ${
                                    isActive
                                        ? "text-brand-primary bg-brand-tint/50"
                                        : "text-text-secondary hover:text-text-primary"
                                }`}
                            >
                                {option.icon}
                            </button>
                        );
                    })}
                </div>

                <div className="relative min-w-0 flex-1 sm:flex-none">
                    <select
                        value={sortBy}
                        onChange={(e) =>
                            onSortChange(e.target.value as ShopSortOption)
                        }
                        aria-label={copy.sortProducts}
                        className={`${selectClass} w-full sm:w-auto`}
                    >
                        {(Object.keys(sortLabel) as ShopSortOption[]).map((value) => (
                            <option key={value} value={value}>
                                {sortLabel[value]}
                            </option>
                        ))}
                    </select>
                    <ChevronDown />
                </div>
            </div>
        </div>
    );
}
