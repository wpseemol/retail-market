import { API_URL } from "@/lib/api";

export type ReviewImage = { id: string; url: string };

export type PublicReview = {
  id: string;
  author_name: string;
  rating: number;
  title: string | null;
  comment: string;
  images: ReviewImage[];
  is_verified_purchase: boolean;
  vendor_reply: string | null;
  vendor_replied_at: string | null;
  created_at: string;
};

export type ReviewSummary = {
  average: number;
  count: number;
  breakdown: Record<"1" | "2" | "3" | "4" | "5", number>;
};

export type ReviewsPayload = {
  summary: ReviewSummary;
  reviews: PublicReview[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
};

export type ReviewStatus = "pending" | "approved" | "hidden" | "rejected";

/** The buyer's own review, with its moderation status. */
export type OwnReview = PublicReview & { status: ReviewStatus };

export type EligibilityResponse =
  | { canReview: true; orderId: string; authorName: string }
  | { canReview: false; reason: "not_purchased"; message: string }
  | { canReview: false; reason: "already_reviewed"; message: string; review: OwnReview | null };

export type CreateReviewResponse = {
  message: string;
  status: ReviewStatus;
  review: PublicReview;
};

export type UpdateReviewResponse = {
  message: string;
  status: ReviewStatus;
  review: OwnReview;
};

export const REVIEW_PAGE_SIZE = 10;
export const REVIEW_MAX_PHOTOS = 4;
export const REVIEW_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

export const EMPTY_REVIEWS: ReviewsPayload = {
  summary: { average: 0, count: 0, breakdown: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } },
  reviews: [],
  pagination: { page: 1, limit: REVIEW_PAGE_SIZE, total: 0, total_pages: 1 },
};

/** Approved reviews only — rendered on the server for SEO. */
export async function fetchProductReviews(idOrSlug: string): Promise<ReviewsPayload> {
  const url = `${API_URL}/api/products/${encodeURIComponent(idOrSlug)}/reviews?limit=${REVIEW_PAGE_SIZE}`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 60, tags: ["reviews", `product-reviews:${idOrSlug}`] },
    });
    if (!res.ok) return EMPTY_REVIEWS;
    return (await res.json()) as ReviewsPayload;
  } catch {
    return EMPTY_REVIEWS;
  }
}

/** Schema.org `aggregateRating` + `review` for the Product JSON-LD. Empty when there are no reviews. */
export function reviewsJsonLd(payload: ReviewsPayload) {
  if (payload.summary.count === 0) return {};
  return {
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: payload.summary.average,
      reviewCount: payload.summary.count,
      bestRating: 5,
      worstRating: 1,
    },
    review: payload.reviews.map((review) => ({
      "@type": "Review",
      author: { "@type": "Person", name: review.author_name },
      datePublished: review.created_at.slice(0, 10),
      ...(review.title ? { name: review.title } : {}),
      reviewBody: review.comment,
      reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5, worstRating: 1 },
    })),
  };
}
