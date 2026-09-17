"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";

export default function Header() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isSticky, setIsSticky] = useState(false);

    useEffect(() => {
        setMounted(true);
        const handleScroll = () => {
            setIsSticky(window.scrollY > 48);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    const isDark = mounted && theme === "dark";

    return (
        <header
            role="banner"
            className={`w-full bg-bg-base transition-all duration-300 z-50 ${
                isSticky
                    ? "fixed top-0 left-0 shadow-[0_4px_20px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
                    : "relative"
            }`}
        >
            {/* 1. Middle Main Section */}
            <section
                aria-label="Main Header Information"
                className="w-full border-b border-border-default py-2"
            >
                <div className="container mx-auto flex items-center justify-between gap-4">
                    {/* Brand Logo with SEO attributes */}
                    <Link
                        href="/"
                        aria-label="Retail Market Home"
                        className="flex items-center shrink-0"
                    >
                        {/* Light Mode Logo */}
                        <Image
                            src="/logo/niyenin-white.png"
                            alt="Retail Market"
                            width={160}
                            height={44}
                            priority
                            className="h-10 w-auto block dark:hidden object-contain"
                        />
                        {/* Dark Mode Logo */}
                        <Image
                            src="/logo/niyenin-dark.png"
                            alt="Retail Market"
                            width={160}
                            height={44}
                            priority
                            className="h-10 w-auto hidden dark:block object-contain"
                        />
                    </Link>

                    {/* Promotional Banner */}
                    <aside
                        aria-label="Promotional Announcement"
                        className="hidden xl:flex items-center rounded overflow-hidden max-h-[52px]"
                    >
                        <Image
                            src="/images/header_ad.jpg"
                            alt="Autoparts Equipment Special Promotion"
                            width={579}
                            height={52}
                            className="h-[52px] w-auto object-cover"
                            priority
                        />
                    </aside>

                    {/* User Utilities (Wishlist, Cart, Theme Toggle) */}
                    <div className="flex items-center gap-4 shrink-0">
                        {/* Wishlist Link */}
                        <Link
                            href="/wishlist"
                            aria-label="View Wishlist"
                            className="relative p-1 hover:opacity-80 transition-opacity"
                        >
                            <Image
                                src="/icons/wish.svg"
                                alt=""
                                width={32}
                                height={32}
                                aria-hidden="true"
                            />
                            <span
                                aria-label="2 items in wishlist"
                                className="absolute -top-1 -right-1 bg-brand-hover text-white text-[10px] font-semibold h-4 min-w-[16px] px-1 rounded-full border border-white flex items-center justify-center"
                            >
                                2
                            </span>
                        </Link>

                        <span
                            className="w-[1px] h-6 bg-border-default"
                            aria-hidden="true"
                        />

                        {/* Shopping Cart Summary */}
                        <Link
                            href="/cart"
                            aria-label="Shopping Cart containing 2 items, total $57.00"
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                        >
                            <div className="relative">
                                <Image
                                    src="/icons/cart.svg"
                                    alt=""
                                    width={34}
                                    height={34}
                                    aria-hidden="true"
                                />
                                <span
                                    aria-label="2 items"
                                    className="absolute -top-1 -right-1 bg-brand-hover text-white text-[10px] font-semibold h-4 min-w-[16px] px-1 rounded-full border border-white flex items-center justify-center"
                                >
                                    2
                                </span>
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-[11px] leading-tight text-text-secondary">
                                    Shopping cart:
                                </span>
                                <span className="text-[14px] font-semibold text-[#7B61FF]">
                                    $57.00
                                </span>
                            </div>
                        </Link>

                        {/* Dark / Light Toggle Switch */}
                        <button
                            type="button"
                            onClick={toggleTheme}
                            aria-label={
                                isDark
                                    ? "Switch to light theme"
                                    : "Switch to dark theme"
                            }
                            className={`w-6 h-10 rounded-full p-[3px] transition-colors duration-200 cursor-pointer flex flex-col justify-between items-center ${
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

            {/* 2. Navigation Menu Bar */}
            <nav
                aria-label="Primary Site Navigation"
                className="w-full bg-bg-base py-3"
            >
                <div className="container mx-auto flex items-center justify-between gap-4">
                    {/* Browse Categories Menu Button */}
                    <button
                        type="button"
                        aria-haspopup="true"
                        aria-expanded="false"
                        className="flex items-center gap-2.5 bg-brand-primary hover:bg-brand-hover text-white text-[15px] font-semibold px-5 py-2.5 rounded transition-colors cursor-pointer"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            aria-hidden="true"
                        >
                            <rect x="1" y="1" width="5" height="5" rx="1" />
                            <rect x="10" y="1" width="5" height="5" rx="1" />
                            <rect x="1" y="10" width="5" height="5" rx="1" />
                            <rect x="10" y="10" width="5" height="5" rx="1" />
                        </svg>
                        <span>Browse Category</span>
                    </button>

                    {/* Navigation Links */}
                    <ul className="hidden lg:flex items-center gap-8 text-[14px] font-medium list-none m-0 p-0">
                        <li>
                            <Link
                                href="/"
                                className="text-brand-primary font-semibold hover:text-brand-hover transition-colors"
                            >
                                Home
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/shop"
                                className="text-text-secondary hover:text-brand-primary transition-colors"
                            >
                                Shop
                            </Link>
                        </li>
                        <li className="relative group cursor-pointer">
                            <span className="flex items-center gap-1 text-text-secondary hover:text-brand-primary transition-colors">
                                Pages
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
                        </li>
                        <li className="relative group cursor-pointer">
                            <span className="flex items-center gap-1 text-text-secondary hover:text-brand-primary transition-colors">
                                Blog
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
                        </li>
                        <li>
                            <Link
                                href="/about"
                                className="text-text-secondary hover:text-brand-primary transition-colors"
                            >
                                About Us
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/contact"
                                className="text-text-secondary hover:text-brand-primary transition-colors"
                            >
                                Contact
                            </Link>
                        </li>
                    </ul>

                    {/* Search Form (SEO-Friendly Form Action) */}
                    <form
                        role="search"
                        action="/search"
                        method="GET"
                        className="flex items-center border border-border-default rounded-full px-4 py-2 w-full max-w-[200px] sm:max-w-[240px] bg-bg-base transition-colors"
                    >
                        <label
                            htmlFor="header-search-input"
                            className="sr-only"
                        >
                            Search products
                        </label>
                        <input
                            id="header-search-input"
                            type="search"
                            name="q"
                            placeholder="Search"
                            className="w-full bg-transparent outline-none text-[14px] text-text-primary placeholder:text-text-secondary"
                        />
                        <button
                            type="submit"
                            aria-label="Submit Search"
                            className="ml-2 shrink-0 cursor-pointer text-text-secondary hover:text-brand-primary"
                        >
                            <Image
                                src="/icons/search.svg"
                                alt=""
                                width={18}
                                height={18}
                                aria-hidden="true"
                                className="opacity-70 hover:opacity-100"
                            />
                        </button>
                    </form>

                    {/* Authentication Entry */}
                    <Link
                        href="/auth/login"
                        className="bg-brand-primary hover:bg-brand-hover text-white text-[14px] font-semibold px-6 py-2.5 rounded transition-colors whitespace-nowrap"
                    >
                        Login / Sign Up
                    </Link>
                </div>
            </nav>
        </header>
    );
}
