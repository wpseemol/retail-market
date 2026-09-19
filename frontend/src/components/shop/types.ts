export type ShopViewMode = "grid4" | "grid3" | "grid2" | "list";

export type ShopSortOption =
    | "default"
    | "price-asc"
    | "price-desc"
    | "name-asc"
    | "rating-desc";

export interface ShopProduct {
    id: number;
    name: string;
    image: string;
    alt: string;
    rating: number;
    reviewCount: number;
    priceMin: number;
    priceMax: number;
    available: number;
    isNew?: boolean;
    category: string;
    brand: string;
    colors: string[];
    tags: string[];
    sku?: string;
    model?: string;
    description?: string;
    gallery?: string[];
    categoryLabels?: string[];
}

export const VIEW_MODE_GRID_CLASS: Record<
    Exclude<ShopViewMode, "list">,
    string
> = {
    grid4: "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4",
    grid3: "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5",
    grid2: "grid grid-cols-1 md:grid-cols-2 gap-6",
};
