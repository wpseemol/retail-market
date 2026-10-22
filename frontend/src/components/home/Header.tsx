"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import PromoAdSlider from "./PromoAdSlider";
import AccountMenu from "./AccountMenu";
import CategoryBrowseMenu from "./CategoryBrowseMenu";
import HeaderSearch from "./HeaderSearch";
import { useAppSelector } from "@/store/hooks";
import { formatPrice } from "@/lib/money";
import {
    selectCartItemCount,
    selectCartSubtotal,
} from "@/store/cartSlice";
import { selectHeaderNav } from "@/store/siteChromeSlice";
import { selectWishlistCount } from "@/store/wishlistSlice";
import { resolveStorefrontHref } from "@/lib/storefrontLinks";
import type { PublicCategory } from "@/lib/categories";
import { useI18n } from "@/components/providers/LocaleProvider";
import { format } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

function fallbackHeaderNav(nav: Dictionary["nav"]) {
    return [
        { id: "home", label: nav.home, href: "/", external: false, position: 0 },
        { id: "shop", label: nav.shop, href: "/shop", external: false, position: 1 },
        {
            id: "stores",
            label: nav.stores,
            href: "/stores",
            external: false,
            position: 2,
        },
        {
            id: "pages",
            label: nav.pages,
            href: "#",
            external: false,
            position: 3,
            children: [
                { id: "faq", label: nav.faq, href: "/faq", external: false, position: 0 },
                {
                    id: "terms",
                    label: nav.terms,
                    href: "/terms",
                    external: false,
                    position: 1,
                },
            ],
        },
        {
            id: "blog",
            label: nav.blog,
            href: "/blog",
            external: false,
            position: 4,
            children: [
                {
                    id: "blog-main",
                    label: nav["blog-main"],
                    href: "/blog",
                    external: false,
                    position: 0,
                },
            ],
        },
        {
            id: "about",
            label: nav.about,
            href: "/about",
            external: false,
            position: 5,
        },
        {
            id: "contact",
            label: nav.contact,
            href: "/contact",
            external: false,
            position: 6,
        },
    ];
}

export default function Header({
    categories = [],
}: {
    categories?: PublicCategory[];
}) {
    const pathname = usePathname();
    const { t } = useI18n();
    const { theme, setTheme } = useTheme();
    const mounted = useSyncExternalStore(
        noopSubscribe,
        () => true,
        () => false,
    );
    const menuRef = useRef<HTMLElement | null>(null);
    const menuSpacerRef = useRef<HTMLDivElement | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const cartCount = useAppSelector(selectCartItemCount);
    const cartTotal = useAppSelector(selectCartSubtotal);
    const wishlistCount = useAppSelector(selectWishlistCount);
    const configuredNav = useAppSelector(selectHeaderNav);
    const headerNav =
        configuredNav.length > 0 ? configuredNav : fallbackHeaderNav(t.nav);

    function linkActive(href: string) {
        if (href === "/") return pathname === "/";
        return pathname === href || pathname.startsWith(`${href}/`);
    }

    const isCart = linkActive("/cart");

    useEffect(() => {
        const menu = menuRef.current;
        const spacer = menuSpacerRef.current;
        if (!menu || !spacer) return;
        let threshold = 0;
        const mark = () => {
            if (!menu.hasAttribute("data-stuck")) {
                threshold = menu.getBoundingClientRect().top + window.scrollY;
            }
            const stuck = window.scrollY > threshold;
            if (stuck) menu.setAttribute("data-stuck", "");
            else menu.removeAttribute("data-stuck");
            spacer.style.height = stuck ? `${menu.offsetHeight}px` : "0px";
        };
        mark();
        window.addEventListener("scroll", mark, { passive: true });
        window.addEventListener("resize", mark);
        return () => {
            window.removeEventListener("scroll", mark);
            window.removeEventListener("resize", mark);
        };
    }, []);

    // Prevent background scroll when mobile drawer is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isMobileMenuOpen]);

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    const toggleDropdown = (name: string) => {
        setOpenDropdown(openDropdown === name ? null : name);
    };

    const isDark = mounted && theme === "dark";

    return (
        <header role="banner" className="w-full bg-bg-base">
            {/* ================= 1. Middle Main Section ================= */}
            <section
                aria-label={t.header.mainInfo}
                className="w-full py-2.5 sm:py-3"
            >
                <div className="container mx-auto flex items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6">
                    {/* Brand Logo */}
                    <Link
                        href="/"
                        aria-label={t.header.homeLabel}
                        className="relative flex h-8 w-[120px] shrink-0 items-center sm:h-10 sm:w-[150px]"
                    >
                        <Image
                            src="/logo/niyenin-white.png"
                            alt="Niyenin"
                            fill
                            sizes="150px"
                            priority
                            className="object-contain object-left dark:hidden"
                        />
                        <Image
                            src="/logo/niyenin-dark.png"
                            alt="Niyenin"
                            fill
                            sizes="150px"
                            priority
                            className="hidden object-contain object-left dark:block"
                        />
                    </Link>

                    {/* Promotional Banner (Desktop & Large Tablets only) */}
                    <PromoAdSlider />

                    {/* User Utilities */}
                    <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
                        {/* Wishlist Link (Hidden on small phones, visible from tablet up) */}
                        <Link
                            href="/wishlist"
                            aria-label={
                                wishlistCount > 0
                                    ? format(t.header.viewWishlistCount, {
                                          count: wishlistCount,
                                      })
                                    : t.header.viewWishlist
                            }
                            className="hidden sm:inline-flex relative p-1.5 hover:opacity-80 transition-opacity"
                        >
                            <Image
                                src="/icons/wish.svg"
                                alt=""
                                width={28}
                                height={28}
                                unoptimized
                                style={{ width: 28, height: 28 }}
                                aria-hidden="true"
                            />
                            {wishlistCount > 0 ? (
                                <span
                                    aria-hidden="true"
                                    className="absolute -top-1 -right-1 bg-brand-hover text-white text-[10px] font-semibold h-4 min-w-4 px-1 rounded-full border border-white flex items-center justify-center"
                                >
                                    {wishlistCount > 99 ? "99+" : wishlistCount}
                                </span>
                            ) : null}
                        </Link>

                        <span
                            className="hidden sm:inline-block w-px h-5 bg-border-default"
                            aria-hidden="true"
                        />

                        {/* Shopping Cart */}
                        <Link
                            href="/cart"
                            aria-label={format(t.header.cartLabel, {
                                count: cartCount,
                                total: formatPrice(cartTotal),
                            })}
                            className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity"
                        >
                            <div className="relative">
                                <Image
                                    src="/icons/cart.svg"
                                    alt=""
                                    width={28}
                                    height={28}
                                    unoptimized
                                    style={{ width: 28, height: 28 }}
                                    aria-hidden="true"
                                />
                                {cartCount > 0 && (
                                    <span
                                        aria-label={format(t.header.cartItems, {
                                            count: cartCount,
                                        })}
                                        className="absolute -top-1 -right-1 bg-brand-hover text-white text-[10px] font-semibold h-4 min-w-4 px-1 rounded-full border border-white flex items-center justify-center"
                                    >
                                        {cartCount}
                                    </span>
                                )}
                            </div>
                            <div className="hidden md:flex flex-col text-left">
                                <span className="text-[11px] leading-tight text-text-secondary">
                                    {t.header.shoppingCart}
                                </span>
                                <span
                                    className={`text-[13px] font-semibold ${
                                        isCart
                                            ? "text-brand-primary"
                                            : "text-[#7B61FF]"
                                    }`}
                                >
                                    {formatPrice(cartTotal)}
                                </span>
                            </div>
                        </Link>

                        {/* Dark / Light Toggle Switch */}
                        <button
                            type="button"
                            onClick={toggleTheme}
                            aria-label={
                                isDark
                                    ? t.header.lightTheme
                                    : t.header.darkTheme
                            }
                            className={`w-6 h-10 rounded-full p-0.75 transition-colors duration-200 cursor-pointer flex flex-col justify-between items-center ${
                                isDark ? "bg-brand-primary" : "bg-[#4D4D4D]"
                            }`}
                        >
                            <span
                                aria-hidden="true"
                                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                                    isDark ? "translate-y-5" : "translate-y-0"
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </section>

            {/* Menu stays fixed. Logo, promo, cart, and theme scroll away. */}
            <nav
                ref={menuRef}
                aria-label={t.header.primaryNav}
                className="relative z-50 w-full border-y border-border-default/50 bg-bg-base data-[stuck]:fixed data-[stuck]:inset-x-0 data-[stuck]:top-0 data-[stuck]:shadow-[0_4px_20px_rgba(0,0,0,0.12)] dark:data-[stuck]:shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
            >
                <div className="flex items-center gap-2 px-4 py-2 lg:hidden">
                    <button
                        type="button"
                        aria-label={t.header.toggleMenu}
                        aria-expanded={isMobileMenuOpen}
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="shrink-0 rounded-md p-2 text-text-primary hover:bg-bg-subtle focus:outline-none"
                    >
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            {isMobileMenuOpen ? (
                                <path d="M18 6L6 18M6 6l12 12" />
                            ) : (
                                <path d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                    <div className="min-w-0 flex-1">
                        <HeaderSearch variant="mobile" categories={categories} />
                    </div>
                </div>
                <div className="container mx-auto hidden items-center justify-between gap-4 px-6 py-2.5 lg:flex">
                    {/* Browse Categories Button */}
                    <CategoryBrowseMenu categories={categories} />

                    {/* Desktop Nav Links */}
                    <ul className="flex items-center gap-6 xl:gap-8 text-[14px] font-medium list-none m-0 p-0">
                        {headerNav.map((item) => {
                            const hasChildren = Boolean(item.children?.length);
                            const resolved = resolveStorefrontHref(item.href);
                            const active = linkActive(resolved.href);
                            if (hasChildren) {
                                return (
                                    <li
                                        key={item.id}
                                        className="relative group cursor-pointer"
                                    >
                                        <span className="flex items-center gap-1 text-text-secondary hover:text-brand-primary transition-colors">
                                            {item.label}
                                            <svg
                                                width="10"
                                                height="6"
                                                viewBox="0 0 10 6"
                                                fill="none"
                                                className="stroke-current stroke-[1.5]"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    d="M1 1L5 5L9 1"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        </span>
                                        <div className="invisible absolute left-0 top-full z-20 min-w-40 rounded-md border border-border-default bg-bg-base py-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
                                            {item.children!.map((child) => {
                                                const c =
                                                    resolveStorefrontHref(
                                                        child.href,
                                                    );
                                                return c.external ? (
                                                    <a
                                                        key={child.id}
                                                        href={c.href}
                                                        className="block px-3 py-1.5 text-text-secondary hover:text-brand-primary"
                                                    >
                                                        {child.label}
                                                    </a>
                                                ) : (
                                                    <Link
                                                        key={child.id}
                                                        href={c.href}
                                                        className="block px-3 py-1.5 text-text-secondary hover:text-brand-primary"
                                                    >
                                                        {child.label}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </li>
                                );
                            }
                            return (
                                <li key={item.id}>
                                    {resolved.external ? (
                                        <a
                                            href={resolved.href}
                                            className="text-text-secondary hover:text-brand-primary transition-colors"
                                        >
                                            {item.label}
                                        </a>
                                    ) : (
                                        <Link
                                            href={resolved.href}
                                            className={`hover:text-brand-hover transition-colors ${
                                                active
                                                    ? "text-brand-primary font-semibold"
                                                    : "text-text-secondary hover:text-brand-primary"
                                            }`}
                                        >
                                            {item.label}
                                        </Link>
                                    )}
                                </li>
                            );
                        })}
                    </ul>

                    {/* Desktop Search Field */}
                    <HeaderSearch variant="desktop" categories={categories} />

                    {/* Account menu — login CTA or avatar when signed in */}
                    <AccountMenu />
                </div>
            </nav>
            <div ref={menuSpacerRef} aria-hidden="true" />

            {/* ================= 4. Mobile & Tablet Slide-over Drawer ================= */}
            <div
                className={`lg:hidden fixed inset-0 z-[70] bg-black/50 ${
                    isMobileMenuOpen ? "block" : "hidden"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
            >
                <div
                    data-lenis-prevent
                    className={`fixed top-0 left-0 bottom-0 w-70 sm:w-80 bg-bg-base border-r border-border-default p-5 flex flex-col justify-between overflow-y-auto`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col gap-6">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-border-default">
                            <span className="text-sm font-semibold text-text-primary">
                                {t.header.menu}
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-1.5 rounded-full hover:bg-bg-subtle text-text-secondary"
                                aria-label={t.header.closeMenu}
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Category Button in Mobile */}
                        <CategoryBrowseMenu
                            categories={categories}
                            variant="mobile"
                            onNavigate={() => setIsMobileMenuOpen(false)}
                        />

                        {/* Navigation List */}
                        <nav className="flex flex-col gap-1 text-[15px] font-medium">
                            {headerNav.map((item) => {
                                const hasChildren = Boolean(
                                    item.children?.length,
                                );
                                const resolved = resolveStorefrontHref(
                                    item.href,
                                );
                                const active = linkActive(resolved.href);
                                if (hasChildren) {
                                    return (
                                        <div key={item.id}>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    toggleDropdown(item.id)
                                                }
                                                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-text-primary hover:bg-bg-subtle"
                                            >
                                                <span>{item.label}</span>
                                                <svg
                                                    width="10"
                                                    height="6"
                                                    viewBox="0 0 10 6"
                                                    fill="none"
                                                    className={`stroke-current stroke-[1.5] transition-transform ${
                                                        openDropdown === item.id
                                                            ? "rotate-180"
                                                            : ""
                                                    }`}
                                                >
                                                    <path d="M1 1L5 5L9 1" />
                                                </svg>
                                            </button>
                                            {openDropdown === item.id ? (
                                                <div className="pl-6 flex flex-col gap-1 py-1 text-sm text-text-secondary">
                                                    {item.children!.map(
                                                        (child) => {
                                                            const c =
                                                                resolveStorefrontHref(
                                                                    child.href,
                                                                );
                                                            return c.external ? (
                                                                <a
                                                                    key={
                                                                        child.id
                                                                    }
                                                                    href={
                                                                        c.href
                                                                    }
                                                                    onClick={() =>
                                                                        setIsMobileMenuOpen(
                                                                            false,
                                                                        )
                                                                    }
                                                                    className="py-1 hover:text-brand-primary"
                                                                >
                                                                    {
                                                                        child.label
                                                                    }
                                                                </a>
                                                            ) : (
                                                                <Link
                                                                    key={
                                                                        child.id
                                                                    }
                                                                    href={
                                                                        c.href
                                                                    }
                                                                    onClick={() =>
                                                                        setIsMobileMenuOpen(
                                                                            false,
                                                                        )
                                                                    }
                                                                    className="py-1 hover:text-brand-primary"
                                                                >
                                                                    {
                                                                        child.label
                                                                    }
                                                                </Link>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                }
                                return resolved.external ? (
                                    <a
                                        key={item.id}
                                        href={resolved.href}
                                        onClick={() =>
                                            setIsMobileMenuOpen(false)
                                        }
                                        className="px-3 py-2 rounded-md text-text-primary hover:bg-bg-subtle"
                                    >
                                        {item.label}
                                    </a>
                                ) : (
                                    <Link
                                        key={item.id}
                                        href={resolved.href}
                                        onClick={() =>
                                            setIsMobileMenuOpen(false)
                                        }
                                        className={`px-3 py-2 rounded-md hover:bg-bg-subtle ${
                                            active
                                                ? "text-brand-primary font-semibold"
                                                : "text-text-primary"
                                        }`}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                            <Link
                                href="/wishlist"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="sm:hidden px-3 py-2 rounded-md text-text-primary hover:bg-bg-subtle flex items-center justify-between"
                            >
                                <span>{t.header.wishlist}</span>
                                {wishlistCount > 0 ? (
                                    <span className="bg-brand-primary text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                        {wishlistCount > 99 ? "99+" : wishlistCount}
                                    </span>
                                ) : null}
                            </Link>
                        </nav>
                    </div>

                    {/* Drawer Bottom Action */}
                    <div className="pt-4 border-t border-border-default flex flex-col gap-3">
                        <AccountMenu
                            variant="mobile"
                            onNavigate={() => setIsMobileMenuOpen(false)}
                        />
                    </div>
                </div>
            </div>
        </header>
    );
}
