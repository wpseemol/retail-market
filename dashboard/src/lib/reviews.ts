import type { StaffRole } from "@/lib/api";

export const REVIEW_STATUSES = ["pending", "approved", "hidden", "rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export type ReviewRow = {
  id: string;
  status: ReviewStatus;
  rating: number;
  title: string | null;
  comment: string;
  images: { id: string; url: string }[];
  is_verified_purchase: boolean;
  author_name: string;
  author_email: string | null;
  author_phone: string | null;
  flagged: boolean;
  flagged_at: string | null;
  flag_reason: string | null;
  vendor_reply: string | null;
  vendor_replied_at: string | null;
  moderated_at: string | null;
  moderated_by: { id: string; name: string; role: StaffRole | "customer" } | null;
  product: {
    id: string;
    name: string;
    slug: string;
    thumbnail_url: string | null;
    vendor: { id: string; shop_name: string } | null;
  };
  order: { id: string; order_number: string } | null;
  created_at: string;
  updated_at: string;
};

export type ReviewCounts = Record<"all" | ReviewStatus, number>;

export type ReviewsListResponse = {
  reviews: ReviewRow[];
  counts: ReviewCounts;
  pagination: { page: number; limit: number; total: number; pages: number };
};

export type ReviewMutationResponse = { message: string; review: ReviewRow };

export const REVIEW_STATUS_META: Record<ReviewStatus, { label: string; pill: string; dot: string }> = {
  pending: {
    label: "Pending",
    pill: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  approved: {
    label: "Approved",
    pill: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  hidden: {
    label: "Hidden",
    pill: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300",
    dot: "bg-slate-500",
  },
  rejected: {
    label: "Rejected",
    pill: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
    dot: "bg-red-500",
  },
};

/** Mirrors `statusBlockReason` in backend-api/src/routes/dashboardReviews.ts. */
export function reviewStatusBlockReason(role: StaffRole, review: ReviewRow, next: ReviewStatus): string | null {
  if (review.status === next) return `Already ${REVIEW_STATUS_META[next].label.toLowerCase()}`;
  if (role === "super_admin" || role === "admin") return null;
  if (next !== "approved" && next !== "hidden") {
    return role === "moderator" ? "Only admins can reject reviews" : "You can only hide or show reviews";
  }
  if (role === "vendor") {
    if (review.status !== "approved" && review.status !== "hidden") {
      return "Pending and rejected reviews are handled by the marketplace team";
    }
    const hiddenByStaff = review.status === "hidden" && review.moderated_by && review.moderated_by.role !== "vendor";
    if (hiddenByStaff && next === "approved") return "Hidden by the marketplace team — only they can show it again";
  }
  return null;
}
