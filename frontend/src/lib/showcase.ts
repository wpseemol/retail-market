import { API_URL } from "@/lib/api";
import type { ReviewImage, ReviewSummary } from "@/lib/reviews";

export type ShowcaseMedia = {
    id: string;
    path: string;
    file_name?: string;
    alt_text?: string | null;
} | null;

export type ShowcaseSectionKey = "featured" | "products" | "about" | "reviews" | "contact" | "policies";
export type ShowcaseHeroStyle = "banner" | "split" | "minimal";
export type AnnouncementTone = "brand" | "info" | "success" | "warning";
export type SocialKey = "facebook" | "instagram" | "youtube" | "tiktok" | "x" | "website";
export type StorefrontSort = "featured_first" | "newest" | "price_asc" | "price_desc";

export const STOREFRONT_SORTS: StorefrontSort[] = ["featured_first", "newest", "price_asc", "price_desc"];

export type ShowcaseContent = {
    hero_style: ShowcaseHeroStyle;
    /** Enabled sections, in page order. */
    sections: ShowcaseSectionKey[];
    about: string | null;
    contact: { phone: string | null; email: string | null; address: string | null; hours: string | null };
    social: Record<SocialKey, string | null>;
    policies: { shipping: string | null; returns: string | null };
    announcement: { enabled: true; text: string | null; link: string | null; tone: AnnouncementTone } | null;
};

/** Fields every store and brand page payload carries. */
export type ShowcasePayload = {
    tagline: string | null;
    accent_color: string | null;
    seo: {
        title: string | null;
        description: string | null;
        keywords: string | null;
        noindex: boolean;
        og_image: ShowcaseMedia;
    };
    showcase: ShowcaseContent;
    review_summary: Pick<ReviewSummary, "average" | "count" | "breakdown">;
};

export type ShowcaseReview = {
    id: string;
    author_name: string;
    rating: number;
    title: string | null;
    comment: string;
    images: ReviewImage[];
    is_verified_purchase: boolean;
    created_at: string;
    product: { name: string; slug: string };
};

export type ShowcaseReviewsPayload = {
    summary: ReviewSummary;
    reviews: ShowcaseReview[];
};

export function parseSort(value: string | undefined): StorefrontSort | undefined {
    return STOREFRONT_SORTS.includes(value as StorefrontSort) ? (value as StorefrontSort) : undefined;
}

/** First page of approved reviews for a store or brand page. */
export async function fetchShowcaseReviews(
    kind: "shops" | "brands",
    slug: string,
    limit = 6,
): Promise<ShowcaseReviewsPayload | null> {
    try {
        const res = await fetch(
            `${API_URL}/api/${kind}/${encodeURIComponent(slug)}/reviews?limit=${limit}`,
            {
                next: {
                    revalidate: 60,
                    tags: ["reviews", kind === "shops" ? `store:${slug}` : `brand:${slug}`],
                },
            },
        );
        if (!res.ok) return null;
        return (await res.json()) as ShowcaseReviewsPayload;
    } catch {
        return null;
    }
}
