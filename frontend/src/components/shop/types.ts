export type ShopViewMode = "grid" | "list";

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
