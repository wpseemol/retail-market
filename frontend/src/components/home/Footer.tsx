"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import { selectSiteChrome } from "@/store/siteChromeSlice";
import { resolveStorefrontHref } from "@/lib/storefrontLinks";
import { useI18n } from "@/components/providers/LocaleProvider";
import { format } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

interface FooterLink {
    label: string;
    href: string;
    external?: boolean;
}

type FooterLinkKey = keyof Dictionary["footer"]["links"];
type FallbackLink = { key: FooterLinkKey; href: string; external?: boolean };

const findItFastLinks: FallbackLink[] = [
    { key: "laptops", href: "/shop?category=laptops" },
    { key: "cameras", href: "/shop?category=cameras" },
    { key: "smartphones", href: "/shop?category=smartphones" },
    { key: "gaming", href: "/shop?category=gaming" },
    { key: "tvAudio", href: "/shop?category=tv-audio" },
    { key: "gadgets", href: "/shop?category=gadgets" },
    { key: "headphones", href: "/shop?category=headphones" },
    { key: "quickLinks", href: "/shop" },
];

const customerCareLinks: FallbackLink[] = [
    { key: "myAccount", href: "/account" },
    { key: "trackOrder", href: "/account/orders" },
    { key: "wishlist", href: "/wishlist" },
    { key: "stores", href: "/stores" },
    { key: "customerService", href: "/contact" },
    { key: "returns", href: "/faq" },
    { key: "faq", href: "/faq" },
    { key: "support", href: "/contact" },
];

/** Storefront footer: one plain dashboard login only (no role URLs). */
const sellAndManageLinks: FallbackLink[] = [
    { key: "dashboardLogin", href: "dashboard", external: true },
];

const FOOTER_SOCIAL = [
    {
        key: "facebook",
        icon: "/icons/fb.svg",
        label: "Facebook",
    },
    {
        key: "twitter",
        icon: "/icons/Twitter X.svg",
        label: "Twitter X",
    },
    {
        key: "youtube",
        icon: "/icons/youtube.svg",
        label: "YouTube",
    },
    {
        key: "linkedin",
        icon: "/icons/linkedIn.svg",
        label: "LinkedIn",
    },
    {
        key: "instagram",
        icon: "/icons/insta.svg",
        label: "Instagram",
    },
] as const;

function localizeLinks(
    links: FallbackLink[],
    labels: Dictionary["footer"]["links"],
): FooterLink[] {
    return links.map(({ key, ...rest }) => ({ ...rest, label: labels[key] }));
}

function FooterNavLink({ link }: { link: FooterLink }) {
    const className =
        "text-text-secondary hover:text-brand-primary text-[14px] transition-colors";
    const resolved = resolveStorefrontHref(link.href);
    const external = link.external || resolved.external;

    if (external) {
        return (
            <a
                href={resolved.href}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
            >
                {link.label}
            </a>
        );
    }

    return (
        <Link href={resolved.href} className={className}>
            {link.label}
        </Link>
    );
}

const weeklySelectedProducts = [
    {
        id: 1,
        title: "Smart Watch for Men Women",
        price: "৳23,640",
        image: "/images/bottom_banner_left_product.png",
    },
    {
        id: 2,
        title: "Apple iPhone 14 Pro Max, 256GB",
        price: "৳106,920",
        image: "/images/Leatest Item (3).png",
    },
    {
        id: 3,
        title: "Surface Laptop Touchscreen",
        price: "৳181,200",
        image: "/images/Deals of The Day product center 1.png",
    },
    {
        id: 4,
        title: "Bearway Super Console x2",
        price: "৳14,160",
        image: "/images/buttom_right_product.png",
    },
    {
        id: 5,
        title: "OneOdio Wired Headphones",
        price: "৳17,880",
        image: "/images/Leatest Item (5).png",
    },
    {
        id: 6,
        title: "Microsoft Surface Pro 9 Tablet",
        price: "৳94,920",
        image: "/images/Deals of The Day product center 4.png",
    },
];

export default function Footer() {
    const currentYear = 2026;
    const chrome = useAppSelector(selectSiteChrome);
    const { t } = useI18n();
    const findLinks =
        chrome.nav.footer_find.length > 0
            ? chrome.nav.footer_find
            : localizeLinks(findItFastLinks, t.footer.links);
    const careLinks =
        chrome.nav.footer_care.length > 0
            ? chrome.nav.footer_care
            : localizeLinks(customerCareLinks, t.footer.links);
    // Always a single Dashboard Login — ignore CMS role links (admin / super_admin / moderator).
    const sellLinks = localizeLinks(sellAndManageLinks, t.footer.links);
    const logoAlt = format(t.footer.logoAlt, { name: chrome.siteName });
    const socialItems = FOOTER_SOCIAL.filter(
        (item) => chrome.social[item.key as keyof typeof chrome.social],
    );

    return (
        <footer className="w-full max-w-full overflow-x-hidden bg-bg-surface border-t border-border-default pt-12 pb-6 transition-colors duration-200">
            <div className="container mx-auto max-w-full px-4 sm:px-6">
                {/* ================= Top Section: 4 Columns ================= */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-12">
                    {/* Column 1: Brand, Description, Contact, Apps (Col span 3) */}
                    <div className="lg:col-span-3 flex flex-col items-start">
                        {/* Dark / Light Mode Logo Toggle */}
                        <Link
                            href="/"
                            className="relative mb-4 inline-block h-12.5 w-45"
                        >
                            <Image
                                src="/logo/niyenin-white.png"
                                alt={logoAlt}
                                fill
                                sizes="180px"
                                className="object-contain object-left dark:hidden"
                            />
                            <Image
                                src="/logo/niyenin-dark.png"
                                alt={logoAlt}
                                fill
                                sizes="180px"
                                className="hidden object-contain object-left dark:block"
                            />
                        </Link>

                        <p className="text-text-secondary text-sm leading-relaxed mb-6 max-w-sm">
                            {chrome.footerBlurb || t.footer.blurb}
                        </p>

                        {/* Support Contact */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 flex items-center justify-center text-brand-primary">
                                <svg
                                    width="36"
                                    height="36"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                                </svg>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-brand-primary text-xs font-bold uppercase tracking-wider">
                                    {chrome.footerCallout || t.footer.callout}
                                </span>
                                <span className="text-text-primary text-[19px] font-bold tracking-tight">
                                    {chrome.footerPhone || "+1(000)000-000"}
                                </span>
                            </div>
                        </div>

                        {/* App Store Buttons */}
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                className="h-10 px-3 bg-black text-white rounded-md flex items-center gap-2 hover:bg-neutral-800 transition-colors dark:border dark:border-neutral-700"
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M3 20.5v-17c0-.83.67-1.5 1.5-1.5.38 0 .74.15 1.01.42l10.87 10.87c.37.37.37.97 0 1.34L5.51 21.58A1.49 1.49 0 0 1 3 20.5zm15.15-8.08l-2.43-2.43 2.5-1.44c1.1-.64 2.51.15 2.51 1.43 0 .54-.29 1.04-.77 1.31l-1.81 1.13z" />
                                </svg>
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[8px] uppercase tracking-wider">
                                        {t.footer.getItOn}
                                    </span>
                                    <span className="text-[13px] font-semibold">
                                        Google Play
                                    </span>
                                </div>
                            </button>

                            <button
                                type="button"
                                className="h-10 px-3 bg-black text-white rounded-md flex items-center gap-2 hover:bg-neutral-800 transition-colors dark:border dark:border-neutral-700"
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M16.36 14c.08-.02.14-.02.22-.02 1.3 0 2.52.54 3.4 1.42.13-1.42-.32-2.82-1.25-3.95-1.12-1.37-2.73-2.22-4.47-2.31-1.33-.07-2.65.4-3.71 1.07-1.02.64-1.63 1.05-2.64 1.05-.98 0-1.68-.45-2.73-1.09-1.21-.73-2.68-1.18-4.14-1.02-2.12.22-4.04 1.45-5.2 3.22C-2.58 18.52 1.63 24 5.91 24c1.24 0 2.45-.63 3.51-1.19 1.02-.54 1.83-.98 2.82-.98 1 0 1.81.44 2.83.98 1.07.56 2.27 1.19 3.52 1.19 1.08 0 2.06-.31 2.92-.85.34.82.91 1.54 1.63 2.06-1.57 2.1-3.69 3.59-6.08 3.59-1.74 0-3.41-.67-4.66-1.89-1.18 1.16-2.8 1.85-4.49 1.85-2.34 0-4.52-1.35-5.69-3.48-1.58-2.9-1.29-6.52.57-9.33 1.41-2.12 3.73-3.52 6.22-3.79 1.69-.18 3.42.41 4.79 1.25 1.05.65 1.69 1.04 2.68 1.04 1.03 0 1.67-.4 2.76-1.06 1.28-.78 2.8-1.29 4.31-1.14 2.02.2 3.91 1.34 5.09 3.08-1.59 1.02-2.62 2.78-2.62 4.73 0 1.68.79 3.21 2.04 4.19-.38 1.13-.98 2.16-1.76 3.06-.9.99-1.92 1.82-3.03 2.42-1.03-1.63-2.82-2.7-4.85-2.7zM14.93 7.64c.94-1.15 1.48-2.67 1.48-4.22 0-.25-.02-.5-.06-.75-1.56.06-3.14.73-4.27 1.88-.93 1.12-1.47 2.61-1.47 4.14 0 .27.03.54.07.8 1.61-.13 3.16-.8 4.25-1.85z" />
                                </svg>
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[8px] uppercase tracking-wider">
                                        {t.footer.downloadOn}
                                    </span>
                                    <span className="text-[13px] font-semibold">
                                        App Store
                                    </span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Column 2: Find It Fast (Col span 2) */}
                    <div className="lg:col-span-2 flex flex-col">
                        <h3 className="text-[#00B207] text-[15px] font-bold uppercase tracking-wider mb-5">
                            {t.footer.findItFast}
                        </h3>
                        <ul className="flex flex-col gap-3 list-none p-0 m-0">
                            {findLinks.map((link) => (
                                <li
                                    key={
                                        "id" in link &&
                                        typeof link.id === "string"
                                            ? link.id
                                            : link.label
                                    }
                                >
                                    <FooterNavLink link={link} />
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 3: Customer Care (Col span 2) */}
                    <div className="lg:col-span-2 flex flex-col">
                        <h3 className="text-[#00B207] text-[15px] font-bold uppercase tracking-wider mb-5">
                            {t.footer.customerCare}
                        </h3>
                        <ul className="flex flex-col gap-3 list-none p-0 m-0">
                            {careLinks.map((link) => (
                                <li
                                    key={
                                        "id" in link &&
                                        typeof link.id === "string"
                                            ? link.id
                                            : link.label
                                    }
                                >
                                    <FooterNavLink link={link} />
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 4: Sell & Manage (Col span 2) */}
                    <div className="lg:col-span-2 flex flex-col">
                        <h3 className="text-[#00B207] text-[15px] font-bold uppercase tracking-wider mb-5">
                            {t.footer.sellAndManage}
                        </h3>
                        <ul className="flex flex-col gap-3 list-none p-0 m-0">
                            {sellLinks.map((link) => (
                                <li
                                    key={
                                        "id" in link &&
                                        typeof link.id === "string"
                                            ? link.id
                                            : link.label
                                    }
                                >
                                    <FooterNavLink link={link} />
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 5: Weekly Selected (Col span 3) */}
                    <div className="lg:col-span-3 flex flex-col">
                        <h3 className="text-[#00B207] text-[15px] font-bold uppercase tracking-wider mb-5">
                            {t.footer.weeklySelected}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                            {weeklySelectedProducts.map((product) => (
                                <Link
                                    key={product.id}
                                    href="/shop"
                                    className="group flex items-center gap-3"
                                >
                                    <div className="w-16 h-16 shrink-0 rounded-md border border-border-default/60 bg-bg-subtle flex items-center justify-center p-1.5 overflow-hidden">
                                        <Image
                                            src={product.image}
                                            alt={product.title}
                                            width={60}
                                            height={60}
                                            className="object-contain transition-transform duration-300 group-hover:scale-105"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <h4 className="text-text-primary text-[13px] font-medium leading-snug line-clamp-2 group-hover:text-brand-primary transition-colors">
                                            {product.title}
                                        </h4>
                                        <span className="text-text-secondary text-[13px] mt-0.5">
                                            {product.price}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ================= Bottom Copyright & Icons Bar ================= */}
                <div className="flex w-full min-w-0 flex-col items-stretch gap-5 py-6 border-t border-border-default/60 lg:flex-row lg:items-center lg:justify-between">
                    {/* Copyright */}
                    <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[12px] leading-relaxed text-text-secondary sm:text-[13px] lg:justify-start lg:text-left">
                        <span className="w-full sm:w-auto">
                            {format(t.footer.copyright, { year: currentYear })}{" "}
                            <strong className="text-[#00B207] font-semibold">
                                {chrome.siteName}
                            </strong>
                            . {t.footer.rights}
                        </span>
                        <span className="hidden text-border-default sm:inline" aria-hidden="true">
                            |
                        </span>
                        <Link href="/terms" className="hover:text-brand-primary">
                            {t.footer.links.terms}
                        </Link>
                        <span className="text-border-default" aria-hidden="true">
                            |
                        </span>
                        <Link href="/faq" className="hover:text-brand-primary">
                            {t.footer.links.faq}
                        </Link>
                    </div>

                    {/* Social + payments stack on mobile so nothing sits in one overflowing row */}
                    <div className="flex w-full min-w-0 flex-col items-center gap-4 lg:w-auto lg:flex-row lg:gap-6">
                        {/* Social: forced wrap — 3 per row on mobile, flex-wrap on larger */}
                        <ul className="m-0 flex w-full max-w-[13.5rem] list-none flex-wrap justify-center gap-x-3 gap-y-3 p-0 lg:max-w-none lg:w-auto lg:gap-3">
                            {socialItems.map((item) => {
                                const href =
                                    chrome.social[
                                        item.key as keyof typeof chrome.social
                                    ]!;
                                return (
                                    <li
                                        key={item.key}
                                        className="flex basis-[28%] justify-center lg:basis-auto"
                                    >
                                        <a
                                            href={href}
                                            target="_blank"
                                            rel="noreferrer"
                                            aria-label={item.label}
                                            title={item.label}
                                            className="inline-flex size-9 items-center justify-center rounded-md text-text-primary opacity-80 transition-transform hover:scale-110 hover:opacity-100"
                                        >
                                            <Image
                                                src={item.icon}
                                                alt=""
                                                width={18}
                                                height={18}
                                                className="size-[18px] brightness-0 dark:invert"
                                            />
                                        </a>
                                    </li>
                                );
                            })}
                        </ul>

                        {/* Payments: wrap to 2–3 rows on mobile */}
                        <div className="flex w-full max-w-[13.5rem] flex-wrap justify-center gap-2 lg:max-w-none lg:w-auto">
                            <span className="flex h-6 w-10 shrink-0 items-center justify-center rounded-[3px] bg-[#FF5F00] text-[8px] font-bold italic text-white">
                                Master
                            </span>
                            <span className="flex h-6 w-10 shrink-0 items-center justify-center rounded-[3px] bg-[#00AEEF] text-[8px] font-bold text-white">
                                AMEX
                            </span>
                            <span className="flex h-6 w-10 shrink-0 items-center justify-center rounded-[3px] bg-[#1A1F71] text-[10px] font-bold italic text-white">
                                VISA
                            </span>
                            <span className="flex h-6 w-10 shrink-0 items-center justify-center rounded-[3px] bg-[#E55C20] text-[7px] font-bold uppercase tracking-tighter text-white">
                                Discover
                            </span>
                            <span className="flex h-6 w-10 shrink-0 items-center justify-center rounded-[3px] bg-[#003087] text-[9px] font-bold italic text-white">
                                PayPal
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
