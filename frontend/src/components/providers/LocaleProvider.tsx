"use client";

import { createContext, useCallback, useContext, useMemo, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
    LOCALE_COOKIE,
    LOCALE_COOKIE_MAX_AGE,
    type Locale,
} from "@/i18n/config";
import { dictionaries, type Dictionary } from "@/i18n/dictionaries";

type LocaleContextValue = {
    locale: Locale;
    t: Dictionary;
    setLocale: (next: Locale) => void;
    pending: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
    locale,
    children,
}: {
    locale: Locale;
    children: ReactNode;
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    const setLocale = useCallback(
        (next: Locale) => {
            if (next === locale) return;
            document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
            document.documentElement.lang = next;
            // Server components and the root layout re-render with the new cookie.
            startTransition(() => router.refresh());
        },
        [locale, router],
    );

    const value = useMemo<LocaleContextValue>(
        () => ({ locale, t: dictionaries[locale], setLocale, pending }),
        [locale, setLocale, pending],
    );

    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n(): LocaleContextValue {
    const ctx = useContext(LocaleContext);
    if (!ctx) throw new Error("useI18n must be used inside <LocaleProvider>");
    return ctx;
}
