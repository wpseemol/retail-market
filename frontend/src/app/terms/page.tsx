import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentHero, HeroPill } from "@/components/content/ContentHero";
import { HelpCta } from "@/components/content/HelpCta";
import { PlainRichText } from "@/components/content/PlainRichText";
import { PrintButton } from "@/components/content/PrintButton";
import { JsonLd } from "@/components/seo/JsonLd";
import { format, LOCALE_TAGS } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/server";
import { fetchContentPage } from "@/lib/contentPages";
import { breadcrumbJsonLd, buildMetadata, getSeoDefaults, webPageJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

const PATH = "/terms";
const anchor = (id: string) => `section-${id}`;

function formatDate(value: string | null | undefined, intl: string) {
    if (!value) return null;
    const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat(intl, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

export async function generateMetadata(): Promise<Metadata> {
    const [page, dict, seo] = await Promise.all([fetchContentPage("terms"), getDictionary(), getSeoDefaults()]);
    const t = dict.contentPages;
    if (!page) return buildMetadata({ title: t.terms, path: PATH, noIndex: true });
    return buildMetadata({
        title: page.seo_title || page.content.hero.title,
        description:
            page.seo_description ||
            page.content.hero.subtitle ||
            format(t.termsFallbackDescription, { site: seo.siteName }),
        path: PATH,
        noIndex: page.noindex,
        ogType: "article",
    });
}

export default async function TermsPage() {
    const [page, dict, locale] = await Promise.all([fetchContentPage("terms"), getDictionary(), getLocale()]);
    if (!page) notFound();
    const t = dict.contentPages;
    const { content } = page;
    const intl = LOCALE_TAGS[locale].intl;

    const effective = formatDate(content.effective_date, intl);
    const updated = formatDate(page.updated_at, intl);
    const words = [content.intro, ...content.sections.map((s) => `${s.title} ${s.body}`)].join(" ").split(/\s+/).length;
    const minutes = Math.max(1, Math.round(words / 200));
    const showToc = content.show_toc && content.sections.length > 1;

    return (
        <main className="showcase-theme flex-1 bg-bg-base">
            <JsonLd
                id="terms-jsonld"
                data={[
                    breadcrumbJsonLd([
                        { name: t.home, path: "/" },
                        { name: content.hero.title, path: PATH },
                    ]),
                    webPageJsonLd({
                        path: PATH,
                        name: content.hero.title,
                        description: page.seo_description || content.hero.subtitle,
                        dateModified: page.updated_at ?? (content.effective_date || null),
                        inLanguage: intl,
                    }),
                ]}
            />
            <ContentHero
                hero={content.hero}
                breadcrumbLabel={t.breadcrumb}
                crumbs={[{ name: t.home, href: "/" }, { name: content.hero.title }]}
                meta={
                    <>
                        {effective ? <HeroPill>{format(t.effective, { date: effective })}</HeroPill> : null}
                        {updated ? <HeroPill>{format(t.lastUpdated, { date: updated })}</HeroPill> : null}
                        <HeroPill>{format(t.readingTime, { count: minutes })}</HeroPill>
                        <PrintButton label={t.print} />
                    </>
                }
            />

            <div className="container mx-auto px-4 py-10 sm:px-6 sm:py-12">
                <div className={cn("gap-12", showToc ? "lg:grid lg:grid-cols-[260px_minmax(0,1fr)]" : "mx-auto max-w-3xl")}>
                    {showToc ? (
                        <nav aria-label={t.onThisPage} className="mb-10 lg:mb-0 print:hidden">
                            <div className="rounded-xl border border-border-default bg-bg-surface p-4 lg:sticky lg:top-36 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto">
                                <p className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
                                    {t.onThisPage}
                                    <span className="font-normal normal-case tracking-normal">
                                        {format(t.sectionsCount, { count: content.sections.length })}
                                    </span>
                                </p>
                                <ol className="space-y-0.5">
                                    {content.sections.map((section, i) => (
                                        <li key={section.id}>
                                            <a
                                                href={`#${anchor(section.id)}`}
                                                className="flex gap-2.5 rounded-md px-2 py-1.5 text-[13px] leading-snug text-text-secondary transition-colors hover:bg-brand-tint/60 hover:text-brand-primary"
                                            >
                                                {content.numbered ? (
                                                    <span className="w-5 shrink-0 tabular-nums text-text-secondary/70">{i + 1}.</span>
                                                ) : null}
                                                <span>{section.title}</span>
                                            </a>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        </nav>
                    ) : null}

                    <article className="min-w-0 max-w-3xl">
                        {content.intro ? (
                            <div className="mb-10 rounded-xl border-l-4 border-brand-primary bg-brand-tint/40 px-5 py-4 text-[15px] leading-7 text-text-primary dark:bg-brand-primary/10">
                                <PlainRichText text={content.intro} />
                            </div>
                        ) : null}

                        <div className="space-y-10">
                            {content.sections.map((section, i) => (
                                <section
                                    key={section.id}
                                    id={anchor(section.id)}
                                    aria-labelledby={`h-${anchor(section.id)}`}
                                    className="scroll-mt-40 break-inside-avoid"
                                >
                                    <h2
                                        id={`h-${anchor(section.id)}`}
                                        className="flex items-baseline gap-3 text-xl font-semibold tracking-tight text-text-primary"
                                    >
                                        {content.numbered ? (
                                            <span className="flex size-8 shrink-0 translate-y-1 items-center justify-center rounded-lg bg-brand-primary text-[13px] font-bold text-white tabular-nums">
                                                {i + 1}
                                            </span>
                                        ) : null}
                                        <span>{section.title}</span>
                                    </h2>
                                    <PlainRichText
                                        text={section.body}
                                        className={cn("mt-3 text-[15px] leading-7 text-text-secondary", content.numbered && "sm:pl-11")}
                                    />
                                </section>
                            ))}
                        </div>

                        <a
                            href="#top"
                            className="mt-10 inline-flex items-center gap-1.5 text-sm font-medium text-brand-primary hover:text-brand-hover print:hidden"
                        >
                            ↑ {t.backToTop}
                        </a>

                        <HelpCta cta={content.contact_cta} />
                    </article>
                </div>
            </div>
        </main>
    );
}
