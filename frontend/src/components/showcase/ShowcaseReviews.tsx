import Link from "next/link";
import { ReviewStars } from "@/components/reviews/ReviewStars";
import type { Dictionary } from "@/i18n/dictionaries";
import { format } from "@/i18n/config";
import type { ShowcaseReviewsPayload } from "@/lib/showcase";
import { SectionHeading } from "./ProductSections";

function firstName(name: string) {
    return name.trim().split(/\s+/)[0] || name;
}

export function ShowcaseReviews({
    data,
    name,
    dict,
    intlLocale,
}: {
    data: ShowcaseReviewsPayload | null;
    name: string;
    dict: Dictionary;
    intlLocale: string;
}) {
    const t = dict.showcase;
    const r = dict.reviews;
    const summary = data?.summary;
    const reviews = data?.reviews ?? [];
    const [before = "", after = ""] = t.reviewOn.split("{product}");
    const dateFormat = new Intl.DateTimeFormat(intlLocale, { year: "numeric", month: "short", day: "numeric" });

    return (
        <section aria-labelledby="reviews-heading">
            <div id="reviews-heading">
                <SectionHeading
                    title={t.reviews}
                    hint={format(t.reviewsHint, { name })}
                    aside={
                        summary && summary.count > 0 ? (
                            <div className="flex items-center gap-3">
                                <span className="text-3xl font-semibold text-text-primary">{summary.average.toFixed(1)}</span>
                                <div>
                                    <ReviewStars rating={summary.average} label={format(r.starsLabel, { rating: summary.average.toFixed(1) })} />
                                    <p className="text-[12px] text-text-secondary">
                                        {summary.count === 1 ? r.basedOnOne : format(r.basedOn, { count: summary.count })}
                                    </p>
                                </div>
                            </div>
                        ) : null
                    }
                />
            </div>

            {reviews.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border-default bg-bg-subtle/40 px-6 py-10 text-center text-sm text-text-secondary">
                    {t.reviewsEmpty}
                </p>
            ) : (
                <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {reviews.map((review) => (
                        <li key={review.id} className="flex flex-col rounded-2xl border border-border-default bg-bg-surface p-5">
                            <div className="flex items-center justify-between gap-2">
                                <ReviewStars rating={review.rating} size={14} label={format(r.starsLabel, { rating: review.rating })} />
                                <time dateTime={review.created_at} className="text-[12px] text-text-secondary">
                                    {dateFormat.format(new Date(review.created_at))}
                                </time>
                            </div>
                            {review.title ? (
                                <p className="mt-3 line-clamp-1 text-[15px] font-semibold text-text-primary">{review.title}</p>
                            ) : null}
                            <p className="mt-2 line-clamp-4 flex-1 text-sm leading-relaxed text-text-secondary">{review.comment}</p>
                            <div className="mt-4 border-t border-border-default pt-3 text-[12px] text-text-secondary">
                                <span className="font-medium text-text-primary" title={review.author_name}>
                                    {firstName(review.author_name)}
                                </span>
                                {review.is_verified_purchase ? <span className="text-sc-accent-text"> · {r.verified}</span> : null}
                                <span className="mt-1 block truncate">
                                    {before}
                                    <Link href={`/shop/${review.product.slug}`} className="hover:text-sc-accent-text hover:underline">
                                        {review.product.name}
                                    </Link>
                                    {after}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
