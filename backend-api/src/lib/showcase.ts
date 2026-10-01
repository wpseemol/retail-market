import type { Prisma } from "@prisma/client";
import { toPublicMedia } from "./user.js";
import {
  ANNOUNCEMENT_TONES,
  SHOWCASE_HERO_STYLES,
  SHOWCASE_SECTION_KEYS,
  SOCIAL_KEYS,
  type ShowcaseContent,
  type ShowcaseSectionKey,
  type SocialKey,
  type UpdateShowcaseInput,
} from "../validators/showcase.js";

type ShowcaseRow = {
  tagline: string | null;
  accent_color: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  noindex: boolean;
  showcase: Prisma.JsonValue | null;
  og_image?: Parameters<typeof toPublicMedia>[0];
};

export type NormalizedShowcase = {
  hero_style: (typeof SHOWCASE_HERO_STYLES)[number];
  sections: { key: ShowcaseSectionKey; enabled: boolean }[];
  about: string | null;
  contact: { phone: string | null; email: string | null; address: string | null; hours: string | null };
  social: Record<SocialKey, string | null>;
  policies: { shipping: string | null; returns: string | null };
  announcement: {
    enabled: boolean;
    text: string | null;
    link: string | null;
    tone: (typeof ANNOUNCEMENT_TONES)[number];
  };
};

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/**
 * Fills defaults for a stored `showcase` JSON blob. Sections keep the saved order;
 * keys missing from the saved list are appended (enabled) so new section types show up.
 */
export function normalizeShowcase(raw: Prisma.JsonValue | null | undefined): NormalizedShowcase {
  const data = obj(raw);
  const savedSections = Array.isArray(data.sections) ? data.sections : [];
  const seen = new Set<string>();
  const sections: NormalizedShowcase["sections"] = [];
  for (const entry of savedSections) {
    const row = obj(entry);
    const key = row.key;
    if (
      typeof key === "string" &&
      (SHOWCASE_SECTION_KEYS as readonly string[]).includes(key) &&
      !seen.has(key)
    ) {
      seen.add(key);
      sections.push({ key: key as ShowcaseSectionKey, enabled: row.enabled !== false });
    }
  }
  for (const key of SHOWCASE_SECTION_KEYS) {
    if (!seen.has(key)) sections.push({ key, enabled: true });
  }

  const contact = obj(data.contact);
  const social = obj(data.social);
  const policies = obj(data.policies);
  const announcement = obj(data.announcement);

  return {
    hero_style: oneOf(data.hero_style, SHOWCASE_HERO_STYLES, "banner"),
    sections,
    about: str(data.about),
    contact: {
      phone: str(contact.phone),
      email: str(contact.email),
      address: str(contact.address),
      hours: str(contact.hours),
    },
    social: Object.fromEntries(SOCIAL_KEYS.map((k) => [k, str(social[k])])) as Record<
      SocialKey,
      string | null
    >,
    policies: { shipping: str(policies.shipping), returns: str(policies.returns) },
    announcement: {
      enabled: announcement.enabled === true && Boolean(str(announcement.text)),
      text: str(announcement.text),
      link: str(announcement.link),
      tone: oneOf(announcement.tone, ANNOUNCEMENT_TONES, "brand"),
    },
  };
}

/** Editor payload for the dashboard (everything, including disabled bits). */
export function toDashboardShowcase(row: ShowcaseRow) {
  return {
    tagline: row.tagline,
    accent_color: row.accent_color,
    seo_title: row.seo_title,
    seo_description: row.seo_description,
    seo_keywords: row.seo_keywords,
    noindex: row.noindex,
    og_image: toPublicMedia(row.og_image),
    showcase: normalizeShowcase(row.showcase),
  };
}

/** Storefront payload: disabled sections and an off announcement are dropped. */
export function toPublicShowcase(row: ShowcaseRow) {
  const showcase = normalizeShowcase(row.showcase);
  return {
    tagline: row.tagline,
    accent_color: row.accent_color,
    seo: {
      title: row.seo_title,
      description: row.seo_description,
      keywords: row.seo_keywords,
      noindex: row.noindex,
      og_image: toPublicMedia(row.og_image),
    },
    showcase: {
      ...showcase,
      sections: showcase.sections.filter((s) => s.enabled).map((s) => s.key),
      announcement: showcase.announcement.enabled ? showcase.announcement : null,
    },
  };
}

type ChangeMap = Record<string, { from: unknown; to: unknown }>;

/**
 * Prisma `data` + history diff for a showcase PATCH. Nested `showcase` content is
 * replaced as a whole (the editor always sends the full object).
 */
export function buildShowcaseUpdate(existing: ShowcaseRow, input: UpdateShowcaseInput) {
  const data: {
    tagline?: string | null;
    accent_color?: string | null;
    seo_title?: string | null;
    seo_description?: string | null;
    seo_keywords?: string | null;
    noindex?: boolean;
    showcase?: Prisma.InputJsonValue;
  } = {};
  const changes: ChangeMap = {};

  const scalarKeys = [
    "tagline",
    "accent_color",
    "seo_title",
    "seo_description",
    "seo_keywords",
    "noindex",
  ] as const;
  for (const key of scalarKeys) {
    const next = input[key];
    if (next === undefined) continue;
    if (next !== existing[key]) {
      changes[key] = { from: existing[key], to: next };
    }
    (data as Record<string, unknown>)[key] = next;
  }

  if (input.showcase) {
    const next = normalizeShowcase(input.showcase as unknown as Prisma.JsonValue);
    const prev = normalizeShowcase(existing.showcase);
    if (JSON.stringify(next) !== JSON.stringify(prev)) {
      const changedParts = (Object.keys(next) as (keyof NormalizedShowcase)[]).filter(
        (k) => JSON.stringify(next[k]) !== JSON.stringify(prev[k]),
      );
      changes.showcase = { from: changedParts, to: "updated" };
    }
    data.showcase = next as unknown as Prisma.InputJsonValue;
  }

  return { data, changes };
}

export type { ShowcaseContent };
