"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, Loader2, MessageSquareReply, PencilLine } from "lucide-react";
import { useI18n } from "@/components/providers/LocaleProvider";
import { LOCALE_TAGS, format } from "@/i18n/config";
import { apiFetch } from "@/lib/api";
import { REVIEW_PAGE_SIZE, type PublicReview, type ReviewsPayload } from "@/lib/reviews";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ReviewStars } from "./ReviewStars";
import WriteReviewDialog from "./WriteReviewDialog";

const STARS = ["5", "4", "3", "2", "1"] as const;

function ReviewerName({ fullName }: { fullName: string }) {
  const firstName = fullName.trim().split(/\s+/)[0] || fullName;
  if (firstName === fullName.trim()) {
    return <h3 className="m-0 text-[14px] font-semibold text-text-primary">{fullName}</h3>;
  }
  return (
    <h3 className="m-0 text-[14px] font-semibold text-text-primary">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              aria-label={fullName}
              className="cursor-default rounded underline decoration-dotted decoration-text-secondary/50 underline-offset-4 focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none"
            >
              {firstName}
            </span>
          </TooltipTrigger>
          <TooltipContent>{fullName}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </h3>
  );
}

export default function ProductReviews({
  productSlug,
  productName,
  storeName,
  initial,
  titleId,
}: {
  productSlug: string;
  productName: string;
  storeName?: string | null;
  initial: ReviewsPayload;
  titleId: string;
}) {
  const { t, locale } = useI18n();
  const copy = t.reviews;
  const [summary, setSummary] = useState(initial.summary);
  const [reviews, setReviews] = useState<PublicReview[]>(initial.reviews);
  const [page, setPage] = useState(initial.pagination.page);
  const [totalPages, setTotalPages] = useState(initial.pagination.total_pages);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Fixed time zone so server and browser render the same date during hydration.
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(LOCALE_TAGS[locale].intl, { dateStyle: "medium", timeZone: "Asia/Dhaka" }),
    [locale],
  );
  const numberFormatter = useMemo(() => new Intl.NumberFormat(LOCALE_TAGS[locale].intl), [locale]);

  async function loadMore() {
    setLoading(true);
    setLoadError(false);
    try {
      const next = await apiFetch<ReviewsPayload>(
        `/api/products/${encodeURIComponent(productSlug)}/reviews?page=${page + 1}&limit=${REVIEW_PAGE_SIZE}`,
      );
      setReviews((current) => {
        const seen = new Set(current.map((review) => review.id));
        return [...current, ...next.reviews.filter((review) => !seen.has(review.id))];
      });
      setPage(next.pagination.page);
      setTotalPages(next.pagination.total_pages);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  /** After a create / edit / delete, reload the first page so the summary and list match the API. */
  async function refresh() {
    try {
      const fresh = await apiFetch<ReviewsPayload>(
        `/api/products/${encodeURIComponent(productSlug)}/reviews?page=1&limit=${REVIEW_PAGE_SIZE}`,
      );
      setSummary(fresh.summary);
      setReviews(fresh.reviews);
      setPage(fresh.pagination.page);
      setTotalPages(fresh.pagination.total_pages);
      setLoadError(false);
    } catch {
      /* the list stays as it was; the next page load shows the change */
    }
  }

  const average = numberFormatter.format(summary.average);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={titleId} className="m-0 text-[18px] font-bold text-text-primary">
          {copy.title}
        </h2>
        <WriteReviewDialog
          productSlug={productSlug}
          productName={productName}
          onChanged={refresh}
          trigger={
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-primary px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              <PencilLine className="size-4" aria-hidden="true" />
              {copy.write}
            </button>
          }
        />
      </div>

      {summary.count > 0 ? (
        <div className="grid gap-5 rounded-xl border border-border-default bg-bg-subtle p-4 sm:grid-cols-[auto_1fr] sm:gap-8 sm:p-5">
          <div className="flex flex-col items-center justify-center gap-1.5 text-center sm:min-w-36">
            <p className="m-0 text-[40px] leading-none font-bold text-text-primary">
              {average}
              <span className="ml-1 text-[14px] font-medium text-text-secondary">{copy.outOf}</span>
            </p>
            <ReviewStars rating={summary.average} size={18} label={format(copy.starsLabel, { rating: average })} />
            <p className="m-0 text-[12px] text-text-secondary">
              {summary.count === 1
                ? copy.basedOnOne
                : format(copy.basedOn, { count: numberFormatter.format(summary.count) })}
            </p>
          </div>
          <ul className="m-0 flex list-none flex-col justify-center gap-1.5 p-0">
            {STARS.map((star) => {
              const count = summary.breakdown[star];
              const pct = summary.count ? Math.round((count / summary.count) * 100) : 0;
              return (
                <li
                  key={star}
                  className="flex items-center gap-3 text-[12px] text-text-secondary"
                  aria-label={format(copy.starRowCount, { star, count })}
                >
                  <span className="w-12 shrink-0" aria-hidden="true">
                    {format(copy.starRow, { star: numberFormatter.format(Number(star)) })}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-border-default" aria-hidden="true">
                    <span className="block h-full rounded-full bg-[#FF8A00]" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="w-8 shrink-0 text-right tabular-nums" aria-hidden="true">
                    {numberFormatter.format(count)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="m-0 rounded-xl border border-dashed border-border-default p-5 text-center text-[13px] text-text-secondary">
          {copy.empty}
        </p>
      )}

      {reviews.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-5 p-0">
          {reviews.map((review) => (
            <li key={review.id} className="border-b border-border-default pb-5 last:border-0 last:pb-0">
              <article className="flex flex-col gap-2">
                <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <ReviewerName fullName={review.author_name} />
                  <ReviewStars
                    rating={review.rating}
                    size={14}
                    label={format(copy.starsLabel, { rating: review.rating })}
                  />
                  {review.is_verified_purchase && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-semibold text-brand-deep">
                      <BadgeCheck className="size-3.5" aria-hidden="true" />
                      {copy.verified}
                    </span>
                  )}
                  <time dateTime={review.created_at} className="text-[12px] text-text-secondary sm:ml-auto">
                    {dateFormatter.format(new Date(review.created_at))}
                  </time>
                </header>
                {review.title && <p className="m-0 text-[14px] font-semibold text-text-primary">{review.title}</p>}
                <p className="m-0 text-[13px] leading-relaxed whitespace-pre-line text-text-secondary">
                  {review.comment}
                </p>
                {review.images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {review.images.map((image, index) => (
                      <a
                        key={image.id}
                        href={image.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block size-20 overflow-hidden rounded-lg border border-border-default bg-bg-subtle"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.url}
                          alt={format(copy.photoAlt, { index: index + 1, name: review.author_name })}
                          loading="lazy"
                          className="size-full object-cover transition-transform hover:scale-105"
                        />
                      </a>
                    ))}
                  </div>
                )}
                {review.vendor_reply && (
                  <div className="mt-1 rounded-lg border-l-4 border-brand-primary bg-bg-subtle px-3.5 py-2.5">
                    <p className="m-0 mb-1 inline-flex items-center gap-1.5 text-[12px] font-semibold text-text-primary">
                      <MessageSquareReply className="size-3.5" aria-hidden="true" />
                      {storeName ? format(copy.merchantReply, { store: storeName }) : copy.merchantReplyGeneric}
                    </p>
                    <p className="m-0 text-[13px] leading-relaxed whitespace-pre-line text-text-secondary">
                      {review.vendor_reply}
                    </p>
                  </div>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}

      {page < totalPages && (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-default px-5 text-[13px] font-medium text-text-primary transition-colors hover:border-brand-primary hover:text-brand-primary disabled:opacity-60"
          >
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {loading ? copy.loading : copy.loadMore}
          </button>
          {loadError && (
            <p role="alert" className="m-0 text-[12px] text-error">
              {copy.loadFailed}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
