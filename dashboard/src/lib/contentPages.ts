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
export type FaqLayout = "accordion" | "grid";

export type FaqContent = {
  hero: ContentHero;
  layout: FaqLayout;
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

export type ContentByKey = { faq: FaqContent; terms: TermsContent };

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

export const CONTENT_PAGE_META: Record<ContentPageKey, { label: string; path: string; api: string }> = {
  faq: { label: "FAQ page", path: "/faq", api: "/api/dashboard/pages/faq" },
  terms: { label: "Terms & conditions", path: "/terms", api: "/api/dashboard/pages/terms" },
};

/** Matches the API id rule `^[a-z0-9][a-z0-9-]{0,39}$`. */
export function newItemId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export const LIST_LIMITS = {
  faqCategories: 20,
  faqItemsPerCategory: 50,
  termsSections: 50,
} as const;
