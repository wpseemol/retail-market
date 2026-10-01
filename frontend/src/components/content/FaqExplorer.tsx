"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { format } from "@/i18n/config";
import type { FaqContent } from "@/lib/contentPages";
import { cn } from "@/lib/utils";
import { PlainRichText } from "./PlainRichText";

type T = Dictionary["contentPages"];

const anchor = (catId: string) => `topic-${catId}`;

function countLabel(t: T, n: number) {
    return n === 1 ? t.questionsOne : format(t.questionsCount, { count: n });
}

export function FaqExplorer({ content, t }: { content: FaqContent; t: T }) {
    const [query, setQuery] = useState("");
    const deferred = useDeferredValue(query);
    const q = deferred.trim().toLowerCase();

    const categories = useMemo(() => {
        if (!q) return content.categories;
        return content.categories
            .map((cat) => ({
                ...cat,
                items: cat.items.filter(
                    (item) => item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q),
                ),
            }))
            .filter((cat) => cat.items.length > 0);
    }, [content.categories, q]);

    const matchCount = categories.reduce((sum, c) => sum + c.items.length, 0);
    const showNav = content.show_category_nav && content.categories.length > 1;
    const firstItemId = content.categories[0]?.items[0]?.id;

    if (content.categories.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-border-default bg-bg-subtle/40 px-6 py-16 text-center text-sm text-text-secondary">
                {t.emptyFaq}
            </div>
        );
    }

    return (
        <div>
            {content.show_search ? (
                <div className="relative z-10 -mt-14 mb-10 sm:-mt-16">
                    <div className="mx-auto max-w-2xl rounded-2xl border border-border-default bg-bg-surface p-2 shadow-lg shadow-black/5">
                        <label htmlFor="faq-search" className="sr-only">
                            {t.searchLabel}
                        </label>
                        <div className="relative">
                            <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-text-secondary"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <circle cx="11" cy="11" r="7" />
                                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                            </svg>
                            <input
                                id="faq-search"
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value.slice(0, 100))}
                                placeholder={t.searchPlaceholder}
                                autoComplete="off"
                                className="h-13 w-full rounded-xl bg-transparent pl-12 pr-24 text-[15px] text-text-primary outline-none placeholder:text-text-secondary/70"
                            />
                            {query ? (
                                <button
                                    type="button"
                                    onClick={() => setQuery("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-[13px] font-medium text-text-secondary hover:bg-bg-subtle hover:text-text-primary"
                                >
                                    {t.clearSearch}
                                </button>
                            ) : null}
                        </div>
                    </div>
                    {q ? (
                        <p className="mt-3 text-center text-sm text-text-secondary" aria-live="polite">
                            {matchCount === 0
                                ? format(t.noResults, { q: deferred.trim() })
                                : matchCount === 1
                                  ? format(t.resultsOne, { q: deferred.trim() })
                                  : format(t.resultsCount, { count: matchCount, q: deferred.trim() })}
                        </p>
                    ) : null}
                </div>
            ) : null}

            <div className={cn("gap-10", showNav ? "lg:grid lg:grid-cols-[240px_minmax(0,1fr)]" : "mx-auto max-w-4xl")}>
                {showNav ? (
                    <nav aria-label={t.topics} className="mb-8 lg:mb-0">
                        <div className="lg:sticky lg:top-36">
                            <p className="mb-3 hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary lg:block">
                                {t.topics}
                            </p>
                            <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
                                {content.categories.map((cat) => {
                                    const visible = categories.find((c) => c.id === cat.id);
                                    return (
                                        <li key={cat.id} className="shrink-0">
                                            <a
                                                href={`#${anchor(cat.id)}`}
                                                aria-disabled={!visible}
                                                className={cn(
                                                    "flex items-center justify-between gap-3 rounded-full border border-border-default px-4 py-2 text-[13px] font-medium transition-colors lg:rounded-lg lg:border-transparent lg:px-3",
                                                    visible
                                                        ? "text-text-primary hover:border-brand-primary hover:text-brand-primary lg:hover:bg-brand-tint/60"
                                                        : "pointer-events-none text-text-secondary/50",
                                                )}
                                            >
                                                <span>{cat.title}</span>
                                                <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-[11px] tabular-nums text-text-secondary">
                                                    {visible ? visible.items.length : 0}
                                                </span>
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </nav>
                ) : null}

                <div className="min-w-0 space-y-12">
                    {q && matchCount === 0 ? (
                        <div className="rounded-lg border border-dashed border-border-default bg-bg-subtle/40 px-6 py-14 text-center">
                            <p className="text-sm font-medium text-text-primary">{format(t.noResults, { q: deferred.trim() })}</p>
                            <p className="mt-1 text-sm text-text-secondary">{t.noResultsHint}</p>
                        </div>
                    ) : null}

                    {categories.map((cat) => (
                        <section key={cat.id} id={anchor(cat.id)} aria-labelledby={`h-${anchor(cat.id)}`} className="scroll-mt-40">
                            <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-border-default pb-3">
                                <div>
                                    <h2 id={`h-${anchor(cat.id)}`} className="text-xl font-semibold tracking-tight text-text-primary">
                                        {cat.title}
                                    </h2>
                                    {cat.description ? <p className="mt-1 text-sm text-text-secondary">{cat.description}</p> : null}
                                </div>
                                <span className="text-[12px] text-text-secondary">{countLabel(t, cat.items.length)}</span>
                            </div>

                            {content.layout === "grid" ? (
                                <ul className="grid gap-4 sm:grid-cols-2">
                                    {cat.items.map((item) => (
                                        <li
                                            key={item.id}
                                            id={`faq-${item.id}`}
                                            className="scroll-mt-40 rounded-xl border border-border-default bg-bg-surface p-5 transition-colors hover:border-brand-primary/40"
                                        >
                                            <h3 className="flex gap-2.5 text-[15px] font-semibold text-text-primary">
                                                <span aria-hidden="true" className="text-brand-primary">
                                                    Q.
                                                </span>
                                                {item.question}
                                            </h3>
                                            <PlainRichText text={item.answer} className="mt-2.5 text-sm leading-relaxed text-text-secondary" />
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="space-y-3">
                                    {cat.items.map((item) => (
                                        <details
                                            key={`${item.id}-${q ? "search" : "all"}`}
                                            id={`faq-${item.id}`}
                                            open={Boolean(q) || (content.expand_first && item.id === firstItemId)}
                                            className="group scroll-mt-40 rounded-xl border border-border-default bg-bg-surface transition-colors open:border-brand-primary/40 open:shadow-sm"
                                        >
                                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-semibold text-text-primary marker:hidden [&::-webkit-details-marker]:hidden">
                                                <span>{item.question}</span>
                                                <span
                                                    aria-hidden="true"
                                                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-text-secondary transition-transform duration-200 group-open:rotate-45 group-open:bg-brand-primary group-open:text-white"
                                                >
                                                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2}>
                                                        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                                                    </svg>
                                                </span>
                                            </summary>
                                            <PlainRichText
                                                text={item.answer}
                                                className="border-t border-border-default/70 px-5 pb-5 pt-4 text-[14px] leading-relaxed text-text-secondary"
                                            />
                                        </details>
                                    ))}
                                </div>
                            )}
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}
