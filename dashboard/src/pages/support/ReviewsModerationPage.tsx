import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  Flag,
  FlagOff,
  ImageIcon,
  Loader2,
  MessageSquareReply,
  MessageSquareText,
  MoreHorizontal,
  RefreshCw,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { ApiError, apiFetch, type StaffRole } from "@/lib/api";
import { formatBdPhone, formatPlacedAt } from "@/lib/orders";
import { REVIEW_DELETE_ROLES, REVIEW_FLAG_ROLES, REVIEW_REPLY_ROLES } from "@/lib/rbac";
import {
  reviewStatusBlockReason,
  type ReviewCounts,
  type ReviewMutationResponse,
  type ReviewRow,
  type ReviewsListResponse,
  type ReviewStatus,
} from "@/lib/reviews";
import { firstZodError, reviewSearchSchema } from "@/lib/validators/review";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { PageHero } from "@/components/dashboard/page-shell";
import { FadeUp } from "@/components/motion";
import { FlaggedChip, ReviewStatusPill, VerifiedPurchasePill } from "@/components/reviews/ReviewBadges";
import { ReviewReplyDialog } from "@/components/reviews/ReviewReplyDialog";
import { ReviewStars } from "@/components/reviews/ReviewStars";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const STOREFRONT_URL =
  (import.meta.env.VITE_STOREFRONT_URL as string | undefined)?.replace(/\/$/, "") ?? "http://localhost:3000";

type TabKey = "all" | "pending" | "approved" | "hidden";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "hidden", label: "Hidden" },
];

const RATING_OPTIONS = [
  { value: "all", label: "All ratings" },
  { value: "5", label: "5 stars" },
  { value: "4", label: "4 stars" },
  { value: "3", label: "3 stars" },
  { value: "2", label: "2 stars" },
  { value: "1", label: "1 star" },
] as const;

const PAGE_SIZE = 20;

const DELETE_BLOCKED_FOR_MODERATOR =
  "Moderators can't permanently delete reviews. Hide it instead, or flag it so an admin can decide.";

type Notice = { tone: "success" | "error"; text: string } | null;

function useNotice() {
  const [notice, setNotice] = useState<Notice>(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), notice.tone === "error" ? 8000 : 4500);
    return () => clearTimeout(t);
  }, [notice]);
  return [notice, setNotice] as const;
}

function NoticeBar({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  if (!notice) return null;
  return (
    <div
      role={notice.tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm",
        notice.tone === "error"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-brand-primary/30 bg-brand-tint/60 text-brand-deep",
      )}
    >
      <p>{notice.text}</p>
      <button type="button" onClick={onClose} className="shrink-0 opacity-70 hover:opacity-100" aria-label="Dismiss">
        <X className="size-4" />
      </button>
    </div>
  );
}

function heroCopy(role: StaffRole | undefined) {
  if (role === "vendor") {
    return "Reviews verified buyers left on your store's products. Hide or show them and post a public reply — ratings can't be edited.";
  }
  if (role === "moderator") {
    return "Inspect the review queue: approve genuine feedback, hide abusive content and flag anything an admin should decide on.";
  }
  return "Every review is tied to a delivered, paid order. Approve, hide, reject or permanently remove reviews across the marketplace.";
}

function ProductCell({ review }: { review: ReviewRow }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-muted">
        {review.product.thumbnail_url ? (
          <img src={review.product.thumbnail_url} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <ImageIcon className="size-4 text-muted-foreground/60" />
        )}
      </span>
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm leading-snug font-medium">{review.product.name}</p>
        {review.product.vendor ? (
          <p className="truncate text-xs text-muted-foreground">{review.product.vendor.shop_name}</p>
        ) : null}
      </div>
    </div>
  );
}

function CustomerCell({ review }: { review: ReviewRow }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="truncate text-sm font-medium">{review.author_name}</p>
      {review.author_email ? <p className="truncate text-xs text-muted-foreground">{review.author_email}</p> : null}
      {review.author_phone ? (
        <span className="inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
          {formatBdPhone(review.author_phone)}
        </span>
      ) : null}
    </div>
  );
}

function ReviewSnippet({ review, onOpen }: { review: ReviewRow; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="group block max-w-xs text-left">
      {review.title ? <p className="truncate text-sm font-medium group-hover:text-brand-primary">{review.title}</p> : null}
      <p className="line-clamp-2 text-xs text-muted-foreground">{review.comment}</p>
      <span className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
        {review.images.length > 0 ? (
          <span className="inline-flex items-center gap-1">
            <ImageIcon className="size-3" />
            {review.images.length}
          </span>
        ) : null}
        {review.vendor_reply ? (
          <span className="inline-flex items-center gap-1">
            <MessageSquareText className="size-3" />
            Replied
          </span>
        ) : null}
      </span>
    </button>
  );
}

type RowHandlers = {
  onView: () => void;
  onStatus: (next: ReviewStatus) => void;
  onFlag?: () => void;
  onReply?: () => void;
  onDelete?: () => void;
};

function ActionItem({
  blocked,
  children,
  ...props
}: { blocked: string | null; children: React.ReactNode } & React.ComponentProps<typeof DropdownMenuItem>) {
  if (!blocked) return <DropdownMenuItem {...props}>{children}</DropdownMenuItem>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <DropdownMenuItem {...props} disabled>
            {children}
          </DropdownMenuItem>
        </div>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-60">
        {blocked}
      </TooltipContent>
    </Tooltip>
  );
}

function RowActions({
  review,
  role,
  busy,
  handlers,
}: {
  review: ReviewRow;
  role: StaffRole;
  busy: boolean;
  handlers: RowHandlers;
}) {
  const isHidden = review.status === "hidden";
  const visibilityTarget: ReviewStatus = isHidden ? "approved" : "hidden";
  const visibilityBlocked = reviewStatusBlockReason(role, review, visibilityTarget);
  const canApprove = review.status === "pending" || review.status === "rejected";
  const approveBlocked = canApprove ? reviewStatusBlockReason(role, review, "approved") : null;
  const showReject = (role === "super_admin" || role === "admin") && review.status !== "rejected";
  const showDelete = role !== "vendor";
  const deleteBlocked = handlers.onDelete ? null : DELETE_BLOCKED_FOR_MODERATOR;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" disabled={busy} aria-label={`Actions for review by ${review.author_name}`}>
          {busy ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate text-xs text-muted-foreground">{review.product.name}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={handlers.onView}>
          <Eye /> View review
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`${STOREFRONT_URL}/shop/${review.product.slug}#product-review`} target="_blank" rel="noreferrer">
            <ExternalLink /> Open product page
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        {canApprove && role !== "vendor" ? (
          <ActionItem blocked={approveBlocked} onSelect={() => handlers.onStatus("approved")}>
            <CheckCircle2 /> Approve
          </ActionItem>
        ) : null}
        {review.status === "approved" || review.status === "hidden" ? (
          <ActionItem blocked={visibilityBlocked} onSelect={() => handlers.onStatus(visibilityTarget)}>
            {isHidden ? <Eye /> : <EyeOff />}
            {isHidden ? "Show comment" : "Hide comment"}
          </ActionItem>
        ) : null}
        {showReject ? (
          <DropdownMenuItem onSelect={() => handlers.onStatus("rejected")}>
            <XCircle /> Reject
          </DropdownMenuItem>
        ) : null}
        {handlers.onFlag ? (
          <DropdownMenuItem onSelect={handlers.onFlag}>
            {review.flagged ? <FlagOff /> : <Flag />}
            {review.flagged ? "Clear flag" : "Flag for admin"}
          </DropdownMenuItem>
        ) : null}
        {handlers.onReply ? (
          <DropdownMenuItem onSelect={handlers.onReply}>
            <MessageSquareReply />
            {review.vendor_reply ? "Edit vendor reply" : "Vendor reply"}
          </DropdownMenuItem>
        ) : null}

        {showDelete ? (
          <>
            <DropdownMenuSeparator />
            <ActionItem blocked={deleteBlocked} variant="destructive" onSelect={handlers.onDelete}>
              <Trash2 /> Delete review
            </ActionItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ReviewDetailDialog({ review, onOpenChange }: { review: ReviewRow | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={review !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        {review ? (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6">{review.title || `Review of ${review.product.name}`}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2">
                <ReviewStars rating={review.rating} />
                <span>
                  {review.author_name} · {formatPlacedAt(review.created_at).date}
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <ReviewStatusPill status={review.status} />
              <VerifiedPurchasePill verified={review.is_verified_purchase} />
              {review.flagged ? <FlaggedChip reason={review.flag_reason} /> : null}
              {review.order ? (
                <span className="text-xs text-muted-foreground">Order #{review.order.order_number}</span>
              ) : null}
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-line">{review.comment}</p>
            {review.images.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {review.images.map((image) => (
                  <a key={image.id} href={image.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border">
                    <img src={image.url} alt="Customer photo" className="aspect-square w-full object-cover" loading="lazy" />
                  </a>
                ))}
              </div>
            ) : null}
            {review.flag_reason ? (
              <p className="rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-900 dark:bg-orange-500/10 dark:text-orange-200">
                Flag note: {review.flag_reason}
              </p>
            ) : null}
            {review.vendor_reply ? (
              <div className="rounded-xl border border-brand-primary/20 bg-brand-tint/40 p-3 text-sm">
                <p className="text-xs font-semibold text-brand-deep">Merchant reply</p>
                <p className="mt-1 whitespace-pre-line">{review.vendor_reply}</p>
              </div>
            ) : null}
            {review.moderated_by ? (
              <p className="text-xs text-muted-foreground">
                Last moderated by {review.moderated_by.name} ({review.moderated_by.role.replace("_", " ")})
                {review.moderated_at ? ` · ${formatPlacedAt(review.moderated_at).date}` : ""}
              </p>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-border/60">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <Skeleton className="size-11 rounded-lg" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="hidden h-4 w-24 md:block" />
          <Skeleton className="hidden h-4 w-32 md:block" />
          <Skeleton className="ml-auto h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function ReviewsModerationPage() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role) ?? "vendor";
  const confirm = useConfirm();
  const canFlag = REVIEW_FLAG_ROLES.includes(role);
  const canReply = REVIEW_REPLY_ROLES.includes(role);
  const canDelete = REVIEW_DELETE_ROLES.includes(role);

  const [data, setData] = useState<ReviewsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [tab, setTab] = useState<TabKey>("all");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [rating, setRating] = useState("all");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ReviewRow | null>(null);
  const [replying, setReplying] = useState<ReviewRow | null>(null);
  const [notice, setNotice] = useNotice();

  useEffect(() => {
    const value = searchDraft;
    const t = setTimeout(() => {
      const parsed = reviewSearchSchema.safeParse(value);
      if (!parsed.success) {
        setSearchError(firstZodError(parsed.error));
        return;
      }
      setSearchError(null);
      if (parsed.data !== q) {
        setQ(parsed.data);
        setPage(1);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [searchDraft, q]);

  const query = useMemo(() => {
    const params = new URLSearchParams({ status: tab, page: String(page), limit: String(PAGE_SIZE) });
    if (flaggedOnly) params.set("flagged", "true");
    if (rating !== "all") params.set("rating", rating);
    if (q) params.set("q", q);
    return params.toString();
  }, [tab, flaggedOnly, rating, q, page]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    apiFetch<ReviewsListResponse>(`/api/dashboard/reviews?${query}`, { token })
      .then((res) => {
        if (cancelled) return;
        if (res.reviews.length === 0 && res.pagination.page > 1 && res.pagination.page > res.pagination.pages) {
          setPage(Math.max(1, res.pagination.pages));
          return;
        }
        setData(res);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Failed to load reviews");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, query, reloadKey]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  function changeFilter(fn: () => void) {
    fn();
    setPage(1);
  }

  async function mutate(review: ReviewRow, path: string, body: unknown, method = "PATCH") {
    setBusyId(review.id);
    try {
      const res = await apiFetch<ReviewMutationResponse>(`/api/dashboard/reviews/${review.id}${path}`, {
        token,
        method,
        body,
      });
      setNotice({ tone: "success", text: res.message });
      setViewing((current) => (current?.id === review.id ? res.review : current));
      refresh();
      return res;
    } finally {
      setBusyId(null);
    }
  }

  async function changeStatus(review: ReviewRow, next: ReviewStatus) {
    try {
      await mutate(review, "/status", { status: next });
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof ApiError ? err.message : "Could not update the review" });
    }
  }

  async function toggleFlag(review: ReviewRow) {
    try {
      await mutate(review, "/flag", { flagged: !review.flagged });
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof ApiError ? err.message : "Could not update the flag" });
    }
  }

  async function saveReply(review: ReviewRow, reply: string) {
    await mutate(review, "/reply", { reply });
  }

  async function removeReply(review: ReviewRow) {
    const ok = await confirm({
      title: "Remove your public reply?",
      description: "The reply disappears from the product page. The review itself stays. This can't be undone, but you can write a new reply later.",
      confirmLabel: "Remove reply",
    });
    if (!ok) return false;
    await mutate(review, "/reply", { reply: "" });
    return true;
  }

  async function deleteReview(review: ReviewRow) {
    const ok = await confirm({
      title: `Delete ${review.author_name}'s review?`,
      description: (
        <>
          The {review.rating}-star review of <strong>{review.product.name}</strong>
          {review.images.length > 0 ? `, its ${review.images.length} photo${review.images.length === 1 ? "" : "s"}` : ""}
          {review.vendor_reply ? " and the merchant reply" : ""} will be permanently removed and the product rating
          recalculated. This cannot be undone — hide it instead if you might need it later.
        </>
      ),
      confirmLabel: "Delete review",
    });
    if (!ok) return;
    setBusyId(review.id);
    try {
      const res = await apiFetch<{ message: string }>(`/api/dashboard/reviews/${review.id}`, { token, method: "DELETE" });
      setNotice({ tone: "success", text: res.message });
      setViewing((current) => (current?.id === review.id ? null : current));
      refresh();
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof ApiError ? err.message : "Could not delete the review" });
    } finally {
      setBusyId(null);
    }
  }

  const handlersFor = (review: ReviewRow): RowHandlers => ({
    onView: () => setViewing(review),
    onStatus: (next) => void changeStatus(review, next),
    onFlag: canFlag ? () => void toggleFlag(review) : undefined,
    onReply: canReply ? () => setReplying(review) : undefined,
    onDelete: canDelete ? () => void deleteReview(review) : undefined,
  });

  const reviews = data?.reviews ?? [];
  const counts: ReviewCounts | undefined = data?.counts;
  const totalPages = Math.max(1, data?.pagination.pages ?? 1);
  const filtersActive = tab !== "all" || flaggedOnly || rating !== "all" || q !== "";

  return (
    <div className="flex flex-col gap-5">
      <PageHero eyebrow="Support & Quality" title="Product reviews" description={heroCopy(role)} />

      <NoticeBar notice={notice} onClose={() => setNotice(null)} />

      <FadeUp>
        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="space-y-3 border-b border-border/70 bg-gradient-to-r from-brand-tint/40 via-background to-background p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="-mx-1 overflow-x-auto px-1 pb-0.5">
                <div role="tablist" aria-label="Filter by review status" className="inline-flex gap-1 rounded-xl border border-border bg-muted/40 p-1">
                  {TABS.map((t) => {
                    const active = tab === t.key;
                    const count = counts ? counts[t.key] : null;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => changeFilter(() => setTab(t.key))}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                          active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {t.label}
                        {count !== null ? (
                          <span
                            className={cn(
                              "rounded-full px-1.5 text-[10px] tabular-nums",
                              active ? "bg-brand-primary text-white" : "bg-muted text-muted-foreground",
                            )}
                          >
                            {count}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
              {canFlag ? (
                <Button
                  variant={flaggedOnly ? "default" : "outline"}
                  size="sm"
                  className={cn(!flaggedOnly && "bg-background")}
                  aria-pressed={flaggedOnly}
                  onClick={() => changeFilter(() => setFlaggedOnly((v) => !v))}
                >
                  <Flag /> Flagged only
                </Button>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="flex-1">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    placeholder="Search by product, customer, email, phone or review text"
                    className="bg-background pr-9 pl-9"
                    maxLength={120}
                    aria-invalid={searchError ? true : undefined}
                    aria-describedby={searchError ? "review-search-error" : undefined}
                    aria-label="Search reviews"
                  />
                  {searchDraft ? (
                    <button
                      type="button"
                      onClick={() => setSearchDraft("")}
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X className="size-4" />
                    </button>
                  ) : null}
                </div>
                {searchError ? (
                  <p id="review-search-error" className="mt-1 text-xs text-destructive">{searchError}</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Select value={rating} onValueChange={(v) => changeFilter(() => setRating(v))}>
                  <SelectTrigger className="w-full bg-background sm:w-[150px]" aria-label="Rating">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RATING_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filtersActive ? (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      changeFilter(() => {
                        setTab("all");
                        setFlaggedOnly(false);
                        setRating("all");
                        setSearchDraft("");
                        setQ("");
                      })
                    }
                  >
                    <X /> Reset
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {loadError ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <p className="text-sm text-destructive" role="alert">{loadError}</p>
              <Button variant="outline" size="sm" onClick={refresh}>
                <RefreshCw /> Try again
              </Button>
            </div>
          ) : !data && loading ? (
            <TableSkeleton />
          ) : reviews.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <MessageSquareText className="mx-auto size-9 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium">{filtersActive ? "No reviews match these filters" : "No reviews yet"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {filtersActive
                  ? "Try another tab, rating or search term."
                  : "Reviews appear here once customers who received their order rate the product."}
              </p>
            </div>
          ) : (
            <div className={cn("relative transition-opacity", loading && "pointer-events-none opacity-60")}>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1040px] text-sm">
                  <thead>
                    <tr className="border-b border-border/70 bg-muted/30 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                      <th className="px-4 py-3">Product</th>
                      <th className="px-3 py-3">Rating</th>
                      <th className="px-3 py-3">Review</th>
                      <th className="px-3 py-3">Customer</th>
                      <th className="px-3 py-3">Purchase</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="w-12 px-3 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {reviews.map((review) => (
                      <tr key={review.id} className="align-top transition-colors hover:bg-muted/30">
                        <td className="max-w-[260px] px-4 py-3">
                          <ProductCell review={review} />
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <ReviewStars rating={review.rating} />
                          <p className="mt-1 text-[11px] text-muted-foreground">{formatPlacedAt(review.created_at).date}</p>
                        </td>
                        <td className="px-3 py-3">
                          <ReviewSnippet review={review} onOpen={() => setViewing(review)} />
                        </td>
                        <td className="max-w-[220px] px-3 py-3">
                          <CustomerCell review={review} />
                        </td>
                        <td className="px-3 py-3">
                          <VerifiedPurchasePill verified={review.is_verified_purchase} />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col items-start gap-1">
                            <ReviewStatusPill status={review.status} />
                            {review.flagged ? <FlaggedChip reason={review.flag_reason} /> : null}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <RowActions review={review} role={role} busy={busyId === review.id} handlers={handlersFor(review)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-border/60 md:hidden">
                {reviews.map((review) => (
                  <li key={review.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <ProductCell review={review} />
                      <RowActions review={review} role={role} busy={busyId === review.id} handlers={handlersFor(review)} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ReviewStars rating={review.rating} />
                      <ReviewStatusPill status={review.status} />
                      <VerifiedPurchasePill verified={review.is_verified_purchase} />
                      {review.flagged ? <FlaggedChip reason={review.flag_reason} /> : null}
                    </div>
                    <ReviewSnippet review={review} onOpen={() => setViewing(review)} />
                    <CustomerCell review={review} />
                  </li>
                ))}
              </ul>

              {totalPages > 1 ? (
                <nav className="flex items-center justify-between gap-3 border-t border-border/70 px-4 py-3 text-sm" aria-label="Pagination">
                  <span className="text-muted-foreground tabular-nums">
                    Page {page} of {totalPages} · {data?.pagination.total ?? 0} reviews
                  </span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" className="size-8" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
                      <ChevronLeft />
                    </Button>
                    <Button variant="outline" size="icon" className="size-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)} aria-label="Next page">
                      <ChevronRight />
                    </Button>
                  </div>
                </nav>
              ) : null}
            </div>
          )}
        </section>
      </FadeUp>

      <ReviewDetailDialog review={viewing} onOpenChange={(open) => !open && setViewing(null)} />
      <ReviewReplyDialog
        review={replying}
        onOpenChange={(open) => !open && setReplying(null)}
        onSubmit={saveReply}
        onRemove={removeReply}
      />
    </div>
  );
}
