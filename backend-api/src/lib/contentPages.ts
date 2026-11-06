import type { ContentPage } from "@prisma/client";
import {
  contentSchemaByKey,
  type ContentByKey,
  type ContentPageKey,
  type FaqContent,
  type PrivacyContent,
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

const DEFAULT_PRIVACY: PrivacyContent = {
  hero: {
    eyebrow: "Legal",
    title: "Privacy policy",
    subtitle:
      "How Niyenin collects, uses and protects your personal information when you shop, create an account or sign in with Facebook and other services.",
  },
  effective_date: "2026-11-07",
  intro:
    "This privacy policy explains what data Niyenin Retail Market (\"Niyenin\", \"we\", \"us\") processes when you use www.niyenin.com, our mobile experience, or related services such as Facebook Login. By using Niyenin you agree to this policy.",
  show_toc: true,
  numbered: true,
  sections: [
    {
      id: "who-we-are",
      title: "Who we are",
      body:
        "Niyenin is an online retail marketplace based in Bangladesh. We operate the storefront, customer accounts, checkout, payments (through licensed gateways), delivery coordination and customer support.\n\nContact for privacy questions: use the Contact page on this website, or email the address shown in the website footer.",
      enabled: true,
    },
    {
      id: "data-we-collect",
      title: "Information we collect",
      body:
        "Depending on how you use Niyenin, we may process:\n\n- Account details: name, email, phone, password (stored hashed), date of birth or gender if you choose to provide them.\n- Order and delivery details: shipping address, products ordered, payment method chosen, order history and support messages.\n- Sign-in with Facebook, Google or Apple: the provider may share your name, email and profile photo when you allow it. We store the provider name and a provider user id so we can recognise your account next time.\n- Technical data: IP address, device or browser type, approximate location derived from IP for fraud prevention and visit analytics, and cookies or similar storage needed for login, cart and preferences.\n- Marketing preferences: whether you opted in to email or SMS updates.",
      enabled: true,
    },
    {
      id: "how-we-use",
      title: "How we use your information",
      body:
        "We use personal data to:\n\n- Create and secure your account, and keep you signed in.\n- Process orders, payments, refunds and deliveries.\n- Send order confirmations, delivery updates and service messages.\n- Prevent fraud, abuse and unauthorised access.\n- Improve the site (for example which pages are popular).\n- Respond to support requests.\n- Comply with Bangladesh law and lawful requests from authorities.\n\nWe do not sell your personal information.",
      enabled: true,
    },
    {
      id: "facebook-meta",
      title: "Facebook Login and Meta",
      body:
        "If you choose \"Continue with Facebook\", Meta Platforms provides us with information you authorise (typically name, email and profile picture) under Meta's terms and your Facebook privacy settings.\n\nWe use that information only to create or sign you into a Niyenin customer account. We do not post to your Facebook profile without a separate, clear permission.\n\nYou can remove Niyenin from your Facebook Apps and Websites settings at any time. You can also ask us to erase your Niyenin account data — see \"Your rights and data deletion\" below. When Meta notifies us that you deleted our app, we process that request through our data-deletion callback.",
      enabled: true,
    },
    {
      id: "payments",
      title: "Payments",
      body:
        "Online card and mobile banking payments are processed by a licensed payment gateway (for example SSLCOMMERZ). Full card numbers and bank passwords are entered on the gateway's secure pages — we do not store them on our servers. We keep payment status, transaction references and amounts needed for orders and refunds.",
      enabled: true,
    },
    {
      id: "sharing",
      title: "Who we share data with",
      body:
        "We share data only when needed to run the service:\n\n- Delivery partners: name, phone and address to deliver your order.\n- Payment gateways: order amount and references to complete payment.\n- Marketplace sellers: product and fulfilment details for items sold by their store (contact details are limited as much as practical).\n- Hosting, email, SMS and analytics providers that process data on our instructions.\n- Authorities when the law requires it.\n\nService providers must protect the data and use it only for the agreed purpose.",
      enabled: true,
    },
    {
      id: "cookies",
      title: "Cookies and similar technology",
      body:
        "We use cookies and local storage to keep you signed in, remember your cart and language, and measure site traffic. You can block cookies in your browser; some features (such as checkout while signed in) may then stop working.",
      enabled: true,
    },
    {
      id: "retention",
      title: "How long we keep data",
      body:
        "We keep account and order records for as long as your account is active and as needed for legal, tax, dispute and fraud purposes. When you ask us to delete your account, we remove or anonymise personal data that is no longer required, except records we must keep under Bangladesh law (for example completed invoices).",
      enabled: true,
    },
    {
      id: "security",
      title: "Security",
      body:
        "We use HTTPS, hashed passwords, access controls and monitoring to protect personal data. No online service is perfectly secure; please choose a strong password and do not share login codes.",
      enabled: true,
    },
    {
      id: "data-deletion",
      title: "Your rights and data deletion",
      body:
        "Subject to applicable law, you may ask to access, correct or delete personal data we hold about you, or to close your account.\n\nHow to request deletion:\n\n1. Sign in and use Account settings where available, or\n2. Contact us from the Contact page with the email or phone on your account and ask for account deletion, or\n3. If you signed in with Facebook, remove the Niyenin app from Facebook settings; Meta may also call our automated deletion callback.\n\nWe will confirm when the request is complete. Some order records may remain in anonymised or legally required form.",
      enabled: true,
    },
    {
      id: "children",
      title: "Children",
      body:
        "Niyenin is directed at adults. We do not knowingly collect personal information from children under 13. If you believe a child provided data, contact us and we will delete it.",
      enabled: true,
    },
    {
      id: "changes",
      title: "Changes to this policy",
      body:
        "We may update this privacy policy from time to time. The effective date at the top of the page shows when it last changed. Continued use of Niyenin after an update means you accept the revised policy.",
      enabled: true,
    },
    {
      id: "law",
      title: "Governing law",
      body:
        "This policy is governed by the laws of Bangladesh. Privacy disputes are handled under the courts of Dhaka, unless mandatory consumer rules say otherwise.",
      enabled: true,
    },
  ],
  contact_cta: {
    enabled: true,
    title: "Privacy questions?",
    text: "Ask us about your data, account deletion or Facebook Login — we will reply as soon as we can.",
    button_label: "Contact us",
    button_href: "/contact",
  },
};

export const CONTENT_PAGE_DEFAULTS: ContentByKey = {
  faq: DEFAULT_FAQ,
  terms: DEFAULT_TERMS,
  privacy: DEFAULT_PRIVACY,
};

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
    const legal = page.content as TermsContent | PrivacyContent;
    page.content = { ...legal, sections: legal.sections.filter((s) => s.enabled) } as ContentByKey[K];
  }
  return page;
}
