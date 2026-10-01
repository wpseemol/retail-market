import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentHero, HeroPill } from "@/components/content/ContentHero";
import { FaqExplorer } from "@/components/content/FaqExplorer";
import { HelpCta } from "@/components/content/HelpCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { format } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { fetchContentPage } from "@/lib/contentPages";
import { breadcrumbJsonLd, buildMetadata, faqPageJsonLd, getSeoDefaults } from "@/lib/seo";

const PATH = "/faq";

export async function generateMetadata(): Promise<Metadata> {
    const [page, dict, seo] = await Promise.all([fetchContentPage("faq"), getDictionary(), getSeoDefaults()]);
    const t = dict.contentPages;
    if (!page) return buildMetadata({ title: t.faq, path: PATH, noIndex: true });
    return buildMetadata({
        title: page.seo_title || page.content.hero.title,
        description:
            page.seo_description || page.content.hero.subtitle || format(t.faqFallbackDescription, { site: seo.siteName }),
        path: PATH,
        noIndex: page.noindex,
    });
}

export default async function FaqPage() {
    const [page, dict] = await Promise.all([fetchContentPage("faq"), getDictionary()]);
    if (!page) notFound();
    const t = dict.contentPages;
    const { content } = page;
    const total = content.categories.reduce((sum, c) => sum + c.items.length, 0);

    return (
        <main className="showcase-theme flex-1 bg-bg-base">
            <JsonLd
                id="faq-jsonld"
                data={[
                    breadcrumbJsonLd([
                        { name: t.home, path: "/" },
                        { name: content.hero.title, path: PATH },
                    ]),
                    ...(total > 0
                        ? [
                              faqPageJsonLd(
                                  PATH,
                                  content.categories.flatMap((c) => c.items.map((i) => ({ question: i.question, answer: i.answer }))),
                              ),
                          ]
                        : []),
                ]}
            />
            <ContentHero
                hero={content.hero}
                breadcrumbLabel={t.breadcrumb}
                crumbs={[{ name: t.home, href: "/" }, { name: content.hero.title }]}
                meta={
                    total > 0 ? (
                        <>
                            <HeroPill>{format(t.questionsTotal, { count: total })}</HeroPill>
                            {content.categories.length > 1 ? (
                                <HeroPill>
                                    {content.categories.length} {t.topics.toLowerCase()}
                                </HeroPill>
                            ) : null}
                        </>
                    ) : null
                }
            >
                {content.show_search ? <div className="h-8 sm:h-10" aria-hidden="true" /> : null}
            </ContentHero>

            <div className="container mx-auto px-4 pb-14 pt-10 sm:px-6">
                <FaqExplorer content={content} t={t} />
                <HelpCta cta={content.contact_cta} />
            </div>
        </main>
    );
}
