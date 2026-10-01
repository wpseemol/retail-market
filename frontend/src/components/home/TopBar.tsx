"use client";

import React from "react";
import Image from "next/image";
import { useAppSelector } from "@/store/hooks";
import { selectSiteChrome } from "@/store/siteChromeSlice";
import { useI18n } from "@/components/providers/LocaleProvider";
import { format, LOCALE_LABELS, LOCALES } from "@/i18n/config";

function LanguageSwitcher() {
    const { locale, setLocale, pending, t } = useI18n();
    return (
        <div
            role="group"
            aria-label={t.topbar.language}
            aria-busy={pending}
            className={`flex items-center rounded-full border border-border-default p-0.5 ${
                pending ? "opacity-60" : ""
            }`}
        >
            {LOCALES.map((code) => {
                const active = code === locale;
                const label = LOCALE_LABELS[code];
                return (
                    <button
                        key={code}
                        type="button"
                        lang={code}
                        aria-pressed={active}
                        aria-label={format(t.topbar.switchTo, { language: label.native })}
                        title={label.native}
                        disabled={pending}
                        onClick={() => setLocale(code)}
                        className={`min-w-9 rounded-full px-2 py-0.5 text-[12px] leading-[130%] font-medium transition-colors cursor-pointer disabled:cursor-wait ${
                            active
                                ? "bg-brand-primary text-white"
                                : "text-text-secondary hover:text-brand-primary"
                        }`}
                    >
                        {label.short}
                    </button>
                );
            })}
        </div>
    );
}

export default function TopBar() {
    const chrome = useAppSelector(selectSiteChrome);
    const { t } = useI18n();
    const email = chrome.topbarEmail || "retailmarket@gmail.com";
    const phone = chrome.topbarPhone || "+1(213)628-3034";
    const social = chrome.social;
    return (
        <header className="w-full h-12 bg-bg-base border-b border-border-default transition-colors duration-200">
            <div className="container h-full mx-auto flex items-center justify-between gap-2 overflow-hidden">
                {/* Left Section: Email & Phone */}
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <div className="hidden sm:flex items-center gap-1 min-w-0">
                        <Image
                            src="/icons/Envelope.svg"
                            alt={t.topbar.email}
                            width={20}
                            height={20}
                            className="shrink-0"
                        />
                        <a
                            href={`mailto:${email}`}
                            className="truncate text-[12px] leading-[120%] text-text-secondary hover:text-brand-primary transition-colors"
                        >
                            {email}
                        </a>
                    </div>

                    <span className="hidden md:inline-block w-px h-3.75 bg-border-default" />

                    <div className="flex items-center gap-2 min-w-0">
                        <Image
                            src="/icons/Group.svg"
                            alt={t.topbar.phone}
                            width={18}
                            height={18}
                            className="shrink-0"
                        />
                        <a
                            href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                            className="truncate text-[12px] leading-[120%] text-text-secondary hover:text-brand-primary transition-colors"
                        >
                            {phone}
                        </a>
                    </div>
                </div>

                {/* Right Section: Language, Social Media */}
                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                    <LanguageSwitcher />

                    <span className="hidden sm:inline-block w-px h-3.75 bg-border-default" />

                    {/* Social Media Icons — hidden on narrow phones to avoid overflow */}
                    <div className="hidden sm:flex items-center gap-2">
                        {(
                            [
                                {
                                    href: social.facebook,
                                    icon: "/icons/fb.svg",
                                    label: "Facebook",
                                },
                                {
                                    href: social.twitter,
                                    icon: "/icons/Twitter X.svg",
                                    label: "Twitter X",
                                },
                                {
                                    href: social.youtube,
                                    icon: "/icons/youtube.svg",
                                    label: "YouTube",
                                },
                                {
                                    href: social.linkedin,
                                    icon: "/icons/linkedIn.svg",
                                    label: "LinkedIn",
                                },
                                {
                                    href: social.instagram,
                                    icon: "/icons/insta.svg",
                                    label: "Instagram",
                                },
                            ] as const
                        ).map((item) =>
                            item.href ? (
                                <a
                                    key={item.label}
                                    href={item.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label={item.label}
                                    className="opacity-80 hover:opacity-100"
                                >
                                    <Image
                                        src={item.icon}
                                        alt={item.label}
                                        width={16}
                                        height={16}
                                        className="brightness-0 dark:invert"
                                    />
                                </a>
                            ) : null,
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
