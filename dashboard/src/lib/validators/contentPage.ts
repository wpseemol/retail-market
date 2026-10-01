import { z } from "zod";
import type { ContentByKey, ContentPage, ContentPageKey } from "@/lib/contentPages";
import { LIST_LIMITS } from "@/lib/contentPages";
import { optionalText } from "./seo";
import { withSafeInput } from "./safeInput";

/** Mirrors `backend-api/src/validators/contentPage.ts`. */
const safe = (min: number, max: number, label: string) =>
  withSafeInput(
    z
      .string()
      .trim()
      .min(min, `${label} is required`)
      .max(max, `${label} must be at most ${max} characters`),
  );

const itemId = z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/, "Invalid item id");

const ctaHref = withSafeInput(
  z
    .string()
    .trim()
    .max(300)
    .refine(
      (v) =>
        v === "" ||
        /^\/(?!\/)[^\s]*$/.test(v) ||
        /^https:\/\/[^\s]+$/i.test(v) ||
        /^mailto:[^\s@]+@[^\s@]+$/i.test(v) ||
        /^tel:\+?[0-9 -]{5,20}$/i.test(v),
      "Use a site path like /contact, an https:// link, mailto: or tel:",
    ),
);

const heroSchema = z.object({
  eyebrow: safe(0, 40, "Eyebrow"),
  title: safe(2, 120, "Page title"),
  subtitle: safe(0, 300, "Subtitle"),
});

const contactCtaSchema = z
  .object({
    enabled: z.boolean(),
    title: safe(0, 80, "Help box title"),
    text: safe(0, 240, "Help box text"),
    button_label: safe(0, 40, "Button label"),
    button_href: ctaHref,
  })
  .superRefine((v, ctx) => {
    if (!v.enabled) return;
    if (!v.title) ctx.addIssue({ code: "custom", message: "Add a title or hide the help box", path: ["title"] });
    if (v.button_label && !v.button_href) {
      ctx.addIssue({ code: "custom", message: "Add a link for the button", path: ["button_href"] });
    }
  });

const faqItemSchema = z.object({
  id: itemId,
  question: safe(3, 200, "Question"),
  answer: safe(1, 3000, "Answer"),
  enabled: z.boolean(),
});

const faqCategorySchema = z.object({
  id: itemId,
  title: safe(2, 80, "Category title"),
  description: safe(0, 200, "Category description"),
  enabled: z.boolean(),
  items: z.array(faqItemSchema).max(LIST_LIMITS.faqItemsPerCategory, "Too many questions in this category"),
});

export const faqContentSchema = z.object({
  hero: heroSchema,
  layout: z.enum(["accordion", "grid"]),
  show_search: z.boolean(),
  show_category_nav: z.boolean(),
  expand_first: z.boolean(),
  categories: z
    .array(faqCategorySchema)
    .min(1, "Add at least one category")
    .max(LIST_LIMITS.faqCategories, `At most ${LIST_LIMITS.faqCategories} categories`),
  contact_cta: contactCtaSchema,
});

const termsSectionSchema = z.object({
  id: itemId,
  title: safe(2, 120, "Section title"),
  body: safe(1, 10000, "Section text"),
  enabled: z.boolean(),
});

export const termsContentSchema = z.object({
  hero: heroSchema,
  effective_date: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), "Use a valid date"),
  intro: safe(0, 3000, "Introduction"),
  show_toc: z.boolean(),
  numbered: z.boolean(),
  sections: z
    .array(termsSectionSchema)
    .min(1, "Add at least one section")
    .max(LIST_LIMITS.termsSections, `At most ${LIST_LIMITS.termsSections} sections`),
  contact_cta: contactCtaSchema,
});

const metaShape = {
  is_published: z.boolean(),
  noindex: z.boolean(),
  seo_title: optionalText(70),
  seo_description: optionalText(170),
};

export const faqPageFormSchema = z.object({ ...metaShape, content: faqContentSchema });
export const termsPageFormSchema = z.object({ ...metaShape, content: termsContentSchema });

export type PageFormValues<K extends ContentPageKey> = {
  is_published: boolean;
  noindex: boolean;
  seo_title: string;
  seo_description: string;
  content: ContentByKey[K];
};

/** Fields every content page form shares — used by the shared editor sections via `useFormContext`. */
export type PageFormBase = PageFormValues<ContentPageKey>;

export function toPageFormValues<K extends ContentPageKey>(page: ContentPage<K>): PageFormValues<K> {
  return {
    is_published: page.is_published,
    noindex: page.noindex,
    seo_title: page.seo_title ?? "",
    seo_description: page.seo_description ?? "",
    content: structuredClone(page.content),
  };
}

export function toPageApiBody<K extends ContentPageKey>(values: PageFormValues<K>) {
  return {
    is_published: values.is_published,
    noindex: values.noindex,
    seo_title: values.seo_title.trim() || null,
    seo_description: values.seo_description.trim() || null,
    content: values.content,
  };
}
