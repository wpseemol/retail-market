"use client";

function pageList(current: number, total: number): Array<number | "gap"> {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const wanted = new Set(
        [1, total, current - 1, current, current + 1].filter((page) => page >= 1 && page <= total),
    );
    const sorted = [...wanted].sort((a, b) => a - b);
    const list: Array<number | "gap"> = [];
    sorted.forEach((page, index) => {
        const prev = sorted[index - 1];
        if (prev != null && page - prev > 1) list.push("gap");
        list.push(page);
    });
    return list;
}

interface ShopPaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export default function ShopPagination({
    currentPage,
    totalPages,
    onPageChange,
}: ShopPaginationProps) {
    if (totalPages <= 1) return null;

    const pages = pageList(currentPage, totalPages);

    return (
        <nav
            aria-label="Shop pagination"
            className="flex items-center justify-center gap-2 mt-8 pt-2"
        >
            <button
                type="button"
                aria-label="Previous page"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="h-9 w-9 rounded-md border border-border-default bg-bg-surface text-text-secondary flex items-center justify-center hover:border-brand-primary hover:text-brand-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    aria-hidden="true"
                >
                    <path d="M15 18l-6-6 6-6" />
                </svg>
            </button>

            {pages.map((page, index) => {
                if (page === "gap") {
                    return (
                        <span key={`gap-${index}`} className="px-1 text-text-secondary" aria-hidden>
                            …
                        </span>
                    );
                }
                const isActive = page === currentPage;
                return (
                    <button
                        key={page}
                        type="button"
                        aria-label={`Page ${page}`}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => onPageChange(page)}
                        className={`h-9 min-w-9 px-2 rounded-md text-[14px] font-medium transition-colors cursor-pointer ${
                            isActive
                                ? "bg-brand-primary text-white border border-brand-primary"
                                : "bg-bg-surface text-text-secondary border border-border-default hover:border-brand-primary hover:text-brand-primary"
                        }`}
                    >
                        {page}
                    </button>
                );
            })}

            <button
                type="button"
                aria-label="Next page"
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="h-9 w-9 rounded-md border border-border-default bg-bg-surface text-text-secondary flex items-center justify-center hover:border-brand-primary hover:text-brand-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    aria-hidden="true"
                >
                    <path d="M9 18l6-6-6-6" />
                </svg>
            </button>
        </nav>
    );
}
