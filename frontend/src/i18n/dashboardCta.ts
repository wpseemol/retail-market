import type { Locale } from "./config";

/** Footer / chrome CTA — kept outside Dictionary so the label type cannot drift. */
export const DASHBOARD_CTA_LABEL: Record<Locale, string> = {
    en: "Go to Dashboard",
    bn: "ড্যাশবোর্ডে যান",
};

export function dashboardCtaLabel(locale: Locale): string {
    return DASHBOARD_CTA_LABEL[locale];
}
