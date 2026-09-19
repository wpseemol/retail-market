"use client";

import type { ReactNode } from "react";
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

const VIEW_OPTIONS: {
    mode: ShopViewMode;
    label: string;
    icon: ReactNode;
}[] = [
    {
        mode: "grid4",
        label: "4 column grid",
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
        label: "3 column grid",
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
        label: "2 column grid",
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
        label: "List view",
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
                    className="flex items-center gap-0.5 sm:gap-1"
                    role="group"
                    aria-label="Product layout"
                >
                    {VIEW_OPTIONS.map((option) => {
                        const isActive = viewMode === option.mode;
                        return (
                            <button
                                key={option.mode}
                                type="button"
                                aria-label={option.label}
                                aria-pressed={isActive}
                                title={option.label}
                                onClick={() => onViewModeChange(option.mode)}
                                className={`p-1.5 rounded transition-colors cursor-pointer ${
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
