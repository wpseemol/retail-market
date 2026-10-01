export const LOCALES = ["en", "bn"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";
/** One year, in seconds. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LOCALE_LABELS: Record<Locale, { short: string; native: string }> = {
    en: { short: "EN", native: "English" },
    bn: { short: "বাং", native: "বাংলা" },
};

/** BCP 47 tag for Intl formatters and Open Graph. */
export const LOCALE_TAGS: Record<Locale, { intl: string; og: string }> = {
    en: { intl: "en-BD", og: "en_BD" },
    bn: { intl: "bn-BD", og: "bn_BD" },
};

export function isLocale(value: unknown): value is Locale {
    return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Replaces `{name}` placeholders in a dictionary string. */
export function format(template: string, vars: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (match, key: string) =>
        key in vars ? String(vars[key]) : match,
    );
}
