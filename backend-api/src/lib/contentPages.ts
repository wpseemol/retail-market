import type { ContentPage } from "@prisma/client";
import {
  contentSchemaByKey,
  type ContentByKey,
  type ContentPageKey,
  type FaqContent,
  type TermsContent,
} from "../validators/contentPage.js";

const DEFAULT_FAQ: FaqContent = {
  hero: {
    eyebrow: "Help centre",
    title: "Frequently asked questions",
    subtitle: "Quick answers about orders, delivery, payments and returns. Can't find what you need? Our team is one message away.",
  },
  layout: "accordion",
  show_search: true,
  show_category_nav: true,
  expand_first: true,
  categories: [
    {
      id: "orders",
      title: "Orders",
      description: "Placing, tracking and changing orders.",
      enabled: true,
      items: [
        {
          id: "how-to-order",
          question: "How do I place an order?",
          answer:
            "Add the products you like to your cart, open the cart and press Checkout. Enter your delivery details, choose a payment method and confirm. You will get an order number by SMS and email.",
          enabled: true,
        },
        {
          id: "track-order",
          question: "How can I track my order?",
          answer:
            "Sign in and open Account → Orders to see the live status of every order. Guests can use the order number and phone number from the confirmation message.",
          enabled: true,
        },
        {
          id: "change-order",
          question: "Can I change or cancel my order?",
          answer:
            "Yes, as long as the order has not been shipped yet. Contact us with your order number and we will update or cancel it for you.",
          enabled: true,
        },
      ],
    },
    {
      id: "delivery",
      title: "Delivery",
      description: "Shipping areas, timing and charges.",
      enabled: true,
      items: [
        {
          id: "delivery-time",
          question: "How long does delivery take?",
          answer: "Inside Dhaka orders usually arrive in 1–2 working days. Outside Dhaka it takes 2–5 working days.",
          enabled: true,
        },
        {
          id: "delivery-charge",
          question: "How much is the delivery charge?",
          answer:
            "The delivery charge is shown at checkout before you pay. Orders above the free-delivery amount ship free.",
          enabled: true,
        },
      ],
    },
    {
      id: "payments",
      title: "Payments",
      description: "Accepted methods and payment safety.",
      enabled: true,
      items: [
        {
          id: "payment-methods",
          question: "Which payment methods do you accept?",
          answer:
            "Cash on delivery, cards, mobile banking and internet banking. Online payments are processed by a secure, certified payment gateway.",
          enabled: true,
        },
        {
          id: "payment-safe",
          question: "Is online payment safe?",
          answer: "Yes. We never see or store your full card details — they go straight to the payment gateway over an encrypted connection.",
          enabled: true,
        },
      ],
    },
    {
      id: "returns",
      title: "Returns & refunds",
      description: "Damaged, wrong or unwanted items.",
      enabled: true,
      items: [
        {
          id: "return-policy",
          question: "What is your return policy?",
          answer:
            "You can request a return within 7 days of delivery if the item is damaged, defective or not what you ordered. Keep the original box, accessories and invoice.",
          enabled: true,
        },
        {
          id: "refund-time",
          question: "When will I get my refund?",
          answer: "Once we receive and check the returned item, refunds are sent within 7–10 working days to your original payment method.",
          enabled: true,
        },
      ],
    },
  ],
  contact_cta: {
    enabled: true,
    title: "Still need help?",
    text: "Our support team answers every day from 10 AM to 8 PM.",
    button_label: "Contact us",
    button_href: "/contact",
  },
};

const DEFAULT_TERMS: TermsContent = {
  hero: {
    eyebrow: "Legal",
    title: "Terms & conditions",
    subtitle: "The rules for using our marketplace. Please read them carefully before placing an order.",
  },
  effective_date: "2026-10-01",
  intro:
    "By browsing this website or placing an order you agree to these terms. If you do not agree, please do not use the site.",
  show_toc: true,
  numbered: true,
  sections: [
    {
      id: "accounts",
      title: "Accounts",
      body:
        "You are responsible for keeping your login details safe and for all activity on your account.\n\n- Give accurate name, phone and address details.\n- Tell us right away if you think someone else used your account.\n- We may suspend accounts that break these terms.",
      enabled: true,
    },
    {
      id: "orders-pricing",
      title: "Orders & pricing",
      body:
        "All prices are in Bangladeshi Taka (BDT) and include VAT where it applies. An order is confirmed only after we accept it. We may cancel an order if a product is out of stock, the price was shown in error, or the order looks fraudulent — any payment made is refunded in full.",
      enabled: true,
    },
    {
      id: "payments",
      title: "Payments",
      body:
        "You can pay by cash on delivery or online. Online payments are handled by a licensed payment gateway; we do not store your card details.",
      enabled: true,
    },
    {
      id: "delivery",
      title: "Delivery",
      body:
        "Delivery times shown on the site are estimates. Risk in the products passes to you once they are delivered to the address you gave. Please check the parcel in front of the delivery person when possible.",
      enabled: true,
    },
    {
      id: "returns",
      title: "Returns & refunds",
      body:
        "Returns are accepted within 7 days of delivery for damaged, defective or wrong items, in their original packaging with all accessories. Refunds go back to the original payment method within 7–10 working days after the item passes inspection.",
      enabled: true,
    },
    {
      id: "sellers",
      title: "Marketplace sellers",
      body:
        "Some products are sold by independent stores on our marketplace. The store named on the product page is the seller; we provide the platform, payments and support.",
      enabled: true,
    },
    {
      id: "liability",
      title: "Limitation of liability",
      body:
        "To the extent allowed by law, we are not liable for indirect or consequential losses. Our total liability for any order is limited to the amount you paid for it.",
      enabled: true,
    },
    {
      id: "changes",
      title: "Changes to these terms",
      body: "We may update these terms from time to time. The date at the top of this page shows when they last changed.",
      enabled: true,
    },
    {
      id: "law",
      title: "Governing law",
      body: "These terms are governed by the laws of Bangladesh. Disputes fall under the courts of Dhaka.",
      enabled: true,
    },
  ],
  contact_cta: {
    enabled: true,
    title: "Questions about these terms?",
    text: "Reach out and we will explain anything that is unclear.",
    button_label: "Contact us",
    button_href: "/contact",
  },
};

export const CONTENT_PAGE_DEFAULTS: ContentByKey = { faq: DEFAULT_FAQ, terms: DEFAULT_TERMS };

/** Stored JSON that no longer matches the schema falls back to the defaults instead of breaking the page. */
export function readContent<K extends ContentPageKey>(key: K, raw: unknown): ContentByKey[K] {
  const parsed = contentSchemaByKey[key].safeParse(raw);
  return (parsed.success ? parsed.data : structuredClone(CONTENT_PAGE_DEFAULTS[key])) as ContentByKey[K];
}

export function toContentPage<K extends ContentPageKey>(key: K, row: ContentPage | null) {
  return {
    key,
    is_published: row?.is_published ?? true,
    noindex: row?.noindex ?? false,
    seo_title: row?.seo_title ?? null,
    seo_description: row?.seo_description ?? null,
    content: row ? readContent(key, row.content) : structuredClone(CONTENT_PAGE_DEFAULTS[key]),
    is_default: !row,
    updated_at: row?.updated_at.toISOString() ?? null,
  };
}

/** Storefront shape: disabled categories / questions / sections are dropped. */
export function toPublicContentPage<K extends ContentPageKey>(key: K, row: ContentPage | null) {
  const page = toContentPage(key, row);
  if (key === "faq") {
    const faq = page.content as FaqContent;
    page.content = {
      ...faq,
      categories: faq.categories
        .filter((c) => c.enabled)
        .map((c) => ({ ...c, items: c.items.filter((i) => i.enabled) }))
        .filter((c) => c.items.length > 0),
    } as ContentByKey[K];
  } else {
    const terms = page.content as TermsContent;
    page.content = { ...terms, sections: terms.sections.filter((s) => s.enabled) } as ContentByKey[K];
  }
  return page;
}
