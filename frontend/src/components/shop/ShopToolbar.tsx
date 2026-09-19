"use client";

import { SORT_OPTIONS } from "./data";
import type { ShopSortOption, ShopViewMode } from "./types";

interface ShopToolbarProps {
    from: number;
    to: number;
    total: number;
    viewMode: ShopViewMode;
    onViewModeChange: (mode: ShopViewMode) => void;
    sortBy: ShopSortOption;
    onSortChange: (sort: ShopSortOption) => void;
}

export default function ShopToolbar({
    from,
    to,
    total,
    viewMode,
    onViewModeChange,
    sortBy,
    onSortChange,
}: ShopToolbarProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-border-default">
            <p className="text-[14px] text-text-secondary m-0">
                Showing{" "}
                <span className="text-text-primary font-medium">
                    {total === 0 ? 0 : from}-{to}
                </span>{" "}
                of{" "}
                <span className="text-text-primary font-medium">{total}</span>{" "}
                Results
            </p>

            <div className="flex items-center gap-3 sm:gap-4">
                <div
                    className="flex items-center gap-1.5"
                    role="group"
                    aria-label="View mode"
                >
                    <button
                        type="button"
                        aria-label="Grid view"
                        aria-pressed={viewMode === "grid"}
                        onClick={() => onViewModeChange("grid")}
                        className={`p-1.5 rounded transition-colors cursor-pointer ${
                            viewMode === "grid"
                                ? "text-brand-primary"
                                : "text-text-secondary hover:text-text-primary"
                        }`}
                    >
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 18 18"
                            fill="currentColor"
                            aria-hidden="true"
                        >
                            <rect x="1" y="1" width="6" height="6" rx="1" />
                            <rect x="11" y="1" width="6" height="6" rx="1" />
                            <rect x="1" y="11" width="6" height="6" rx="1" />
                            <rect x="11" y="11" width="6" height="6" rx="1" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        aria-label="List view"
                        aria-pressed={viewMode === "list"}
                        onClick={() => onViewModeChange("list")}
                        className={`p-1.5 rounded transition-colors cursor-pointer ${
                            viewMode === "list"
                                ? "text-brand-primary"
                                : "text-text-secondary hover:text-text-primary"
                        }`}
                    >
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
                    </button>
                </div>

                <div className="relative">
                    <select
                        value={sortBy}
                        onChange={(e) =>
                            onSortChange(e.target.value as ShopSortOption)
                        }
                        aria-label="Sort products"
                        className="appearance-none bg-bg-surface border border-border-default rounded-md text-[13px] text-text-primary pl-3 pr-8 py-2 outline-none cursor-pointer hover:border-brand-primary transition-colors"
                    >
                        {SORT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <svg
                        width="10"
                        height="6"
                        viewBox="0 0 10 6"
                        fill="none"
                        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none stroke-text-secondary"
                        aria-hidden="true"
                    >
                        <path
                            d="M1 1L5 5L9 1"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
            </div>
        </div>
    );
}
