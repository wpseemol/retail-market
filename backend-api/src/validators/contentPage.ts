import { z } from "zod";
import { withSafeInput } from "./customerAuth.js";

export const CONTENT_PAGE_KEYS = ["faq", "terms"] as const;
export type ContentPageKey = (typeof CONTENT_PAGE_KEYS)[number];

export const contentPageKeySchema = z.enum(CONTENT_PAGE_KEYS, { message: "Unknown page — use faq or terms" });

const safe = (min: number, max: number, label: string) =>
  withSafeInput(
    z
      .string()
      .trim()
      .min(min, min > 0 ? `${label} is required` : undefined)
      .max(max, `${label} must be at most ${max} characters`),
  );

/** Client-generated list ids, e.g. `shipping` or `q-1a2b`. */
const itemId = z.string().trim().regex(/^[a-z0-9][a-z0-9-]{0,39}$/, "Invalid item id");

/** Site path (`/shop`), https URL, `mailto:` or `tel:`. */
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

function uniqueIds<T extends { id: string }>(list: T[], ctx: z.RefinementCtx, path: (string | number)[]) {
  const seen = new Set<string>();
  list.forEach((item, i) => {
    if (seen.has(item.id)) ctx.addIssue({ code: "custom", message: "Duplicate item id", path: [...path, i, "id"] });
    seen.add(item.id);
  });
}

export const heroSchema = z.object({
  eyebrow: safe(0, 40, "Eyebrow"),
  title: safe(2, 120, "Page title"),
  subtitle: safe(0, 300, "Subtitle"),
});

export const contactCtaSchema = z
  .object({
    enabled: z.boolean(),
    title: safe(0, 80, "Help box title"),
    text: safe(0, 240, "Help box text"),
    button_label: safe(0, 40, "Button label"),
    button_href: ctaHref,
  })
  .superRefine((v, ctx) => {
    if (!v.enabled) return;
    if (!v.title) ctx.addIssue({ code: "custom", message: "Help box title is required when it is shown", path: ["title"] });
    if (v.button_label && !v.button_href) {
      ctx.addIssue({ code: "custom", message: "Add a link for the button", path: ["button_href"] });
    }
  });

export const FAQ_LAYOUTS = ["accordion", "grid"] as const;

export const faqItemSchema = z.object({
  id: itemId,
  question: safe(3, 200, "Question"),
  answer: safe(1, 3000, "Answer"),
  enabled: z.boolean(),
});

export const faqCategorySchema = z
  .object({
    id: itemId,
    title: safe(2, 80, "Category title"),
    description: safe(0, 200, "Category description"),
    enabled: z.boolean(),
    items: z.array(faqItemSchema).max(50, "At most 50 questions per category"),
  })
  .superRefine((cat, ctx) => uniqueIds(cat.items, ctx, ["items"]));

export const faqContentSchema = z
  .object({
    hero: heroSchema,
    layout: z.enum(FAQ_LAYOUTS),
    show_search: z.boolean(),
    show_category_nav: z.boolean(),
    expand_first: z.boolean(),
    categories: z.array(faqCategorySchema).min(1, "Add at least one category").max(20, "At most 20 categories"),
    contact_cta: contactCtaSchema,
  })
  .superRefine((v, ctx) => uniqueIds(v.categories, ctx, ["categories"]));

export const termsSectionSchema = z.object({
  id: itemId,
  title: safe(2, 120, "Section title"),
  body: safe(1, 10000, "Section text"),
  enabled: z.boolean(),
});

export const termsContentSchema = z
  .object({
    hero: heroSchema,
    effective_date: z
      .string()
      .trim()
      .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), "Use a valid date"),
    intro: safe(0, 3000, "Introduction"),
    show_toc: z.boolean(),
    numbered: z.boolean(),
    sections: z.array(termsSectionSchema).min(1, "Add at least one section").max(50, "At most 50 sections"),
    contact_cta: contactCtaSchema,
  })
  .superRefine((v, ctx) => uniqueIds(v.sections, ctx, ["sections"]));

export type FaqContent = z.infer<typeof faqContentSchema>;
export type TermsContent = z.infer<typeof termsContentSchema>;
export type ContentByKey = { faq: FaqContent; terms: TermsContent };

export const contentSchemaByKey = {
  faq: faqContentSchema,
  terms: termsContentSchema,
} as const;

/** Omitted → unchanged; empty → cleared. */
const optionalText = (max: number) =>
  z
    .union([withSafeInput(z.string().trim().max(max)), z.null()])
    .optional()
    .transform((v) => (v === undefined ? undefined : v ? v : null));

export const updateContentPageMetaSchema = z.object({
  is_published: z.boolean().optional(),
  noindex: z.boolean().optional(),
  seo_title: optionalText(70),
  seo_description: optionalText(170),
  /** Whole page body; validated against the page's own schema in the route. */
  content: z.unknown().optional(),
});
