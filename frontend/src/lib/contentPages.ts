import { API_URL } from "@/lib/api";

export type ContentPageKey = "faq" | "terms";

export type ContentHero = { eyebrow: string; title: string; subtitle: string };

export type ContactCta = {
    enabled: boolean;
    title: string;
    text: string;
    button_label: string;
    button_href: string;
};

export type FaqItem = { id: string; question: string; answer: string; enabled: boolean };
export type FaqCategory = { id: string; title: string; description: string; enabled: boolean; items: FaqItem[] };

export type FaqContent = {
    hero: ContentHero;
    layout: "accordion" | "grid";
    show_search: boolean;
    show_category_nav: boolean;
    expand_first: boolean;
    categories: FaqCategory[];
    contact_cta: ContactCta;
};

export type TermsSection = { id: string; title: string; body: string; enabled: boolean };

export type TermsContent = {
    hero: ContentHero;
    effective_date: string;
    intro: string;
    show_toc: boolean;
    numbered: boolean;
    sections: TermsSection[];
    contact_cta: ContactCta;
};

type ContentByKey = { faq: FaqContent; terms: TermsContent };

export type ContentPage<K extends ContentPageKey> = {
    key: K;
    is_published: boolean;
    noindex: boolean;
    seo_title: string | null;
    seo_description: string | null;
    content: ContentByKey[K];
    is_default: boolean;
    updated_at: string | null;
};

/** `null` = unpublished, unknown or API down. Metadata and page call this with the same URL so Next dedupes it. */
export async function fetchContentPage<K extends ContentPageKey>(key: K): Promise<ContentPage<K> | null> {
    try {
        const res = await fetch(`${API_URL}/api/pages/${key}`, {
            next: { revalidate: 300, tags: ["pages", `page:${key}`] },
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { page: ContentPage<K> };
        return data.page;
    } catch {
        return null;
    }
}
