"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import PromoAdSlider from "./PromoAdSlider";

export default function Header() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isSticky, setIsSticky] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    useEffect(() => {
        setTimeout(() => {
            setMounted(true);
        }, 100);
        const handleScroll = () => {
            setIsSticky(window.scrollY > 48);
        };
        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
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
        <header
            role="banner"
            className={`sticky top-0 left-0 w-full border-b border-border-default bg-bg-base z-50 transition-shadow duration-300 ${
                isSticky
                    ? "shadow-[0_4px_20px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
                    : ""
            }`}
        >
            {/* ================= 1. Middle Main Section ================= */}
            <section
                aria-label="Main Header Information"
                className="w-full py-2.5 sm:py-3"
            >
                <div className="container mx-auto flex items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6">
                    {/* Mobile Hamburger Button */}
                    <button
                        type="button"
                        aria-label="Toggle Navigation Menu"
                        aria-expanded={isMobileMenuOpen}
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="lg:hidden p-2 rounded-md text-text-primary hover:bg-bg-subtle transition-colors focus:outline-none"
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

                    {/* Brand Logo */}
                    <Link
                        href="/"
                        aria-label="Retail Market Home"
                        className="flex items-center shrink-0"
                    >
                        <Image
                            src="/logo/niyenin-white.png"
                            alt="Retail Market"
                            width={150}
                            height={40}
                            priority
                            className="h-8 sm:h-10 w-auto block dark:hidden object-contain"
                        />
                        <Image
                            src="/logo/niyenin-dark.png"
                            alt="Retail Market"
                            width={150}
                            height={40}
                            priority
                            className="h-8 sm:h-10 w-auto hidden dark:block object-contain"
                        />
                    </Link>

                    {/* Promotional Banner (Desktop & Large Tablets only) */}
                    <PromoAdSlider />

                    {/* User Utilities */}
                    <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
                        {/* Wishlist Link (Hidden on small phones, visible from tablet up) */}
                        <Link
                            href="/wishlist"
                            aria-label="View Wishlist"
                            className="hidden sm:inline-flex relative p-1.5 hover:opacity-80 transition-opacity"
                        >
                            <Image
                                src="/icons/wish.svg"
                                alt=""
                                width={28}
                                height={28}
                                aria-hidden="true"
                            />
                            <span
                                aria-label="2 items in wishlist"
                                className="absolute -top-1 -right-1 bg-brand-hover text-white text-[10px] font-semibold h-4 min-w-4 px-1 rounded-full border border-white flex items-center justify-center"
                            >
                                2
                            </span>
                        </Link>

                        <span
                            className="hidden sm:inline-block w- h-5 bg-border-default"
                            aria-hidden="true"
                        />

                        {/* Shopping Cart */}
                        <Link
                            href="/cart"
                            aria-label="Shopping Cart containing 2 items, total $57.00"
                            className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity"
                        >
                            <div className="relative">
                                <Image
                                    src="/icons/cart.svg"
                                    alt=""
                                    width={28}
                                    height={28}
                                    className="sm:w-8 sm:h-8"
                                    aria-hidden="true"
                                />
                                <span
                                    aria-label="2 items"
                                    className="absolute -top-1 -right-1 bg-brand-hover text-white text-[10px] font-semibold h-4 min-w-4 px-1 rounded-full border border-white flex items-center justify-center"
                                >
                                    2
                                </span>
                            </div>
                            <div className="hidden md:flex flex-col text-left">
                                <span className="text-[11px] leading-tight text-text-secondary">
                                    Shopping cart:
                                </span>
                                <span className="text-[13px] font-semibold text-[#7B61FF]">
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

            {/* ================= 2. Search on Tablets & Mobile ================= */}
            <div className="lg:hidden px-4 pb-3">
                <form
                    role="search"
                    action="/search"
                    method="GET"
                    className="flex items-center border border-border-default rounded-full px-4 py-2 w-full bg-bg-surface"
                >
                    <input
                        type="search"
                        name="q"
                        placeholder="Search products..."
                        className="w-full bg-transparent outline-none text-[14px] text-text-primary placeholder:text-text-secondary"
                    />
                    <button
                        type="submit"
                        aria-label="Submit Search"
                        className="ml-2 shrink-0 cursor-pointer"
                    >
                        <Image
                            src="/icons/search.svg"
                            alt=""
                            width={16}
                            height={16}
                            aria-hidden="true"
                            className="opacity-70 hover:opacity-100"
                        />
                    </button>
                </form>
            </div>

            {/* ================= 3. Desktop Navigation Menu Bar ================= */}
            <nav
                aria-label="Primary Site Navigation"
                className="hidden lg:block w-full bg-bg-base py-2.5 border-t border-border-default/50"
            >
                <div className="container mx-auto flex items-center justify-between gap-4 px-6">
                    {/* Browse Categories Button */}
                    <button
                        type="button"
                        className="flex items-center gap-2.5 bg-brand-primary hover:bg-brand-hover text-white text-[14px] font-semibold px-4 py-2 rounded transition-colors cursor-pointer"
                    >
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 18 18"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="shrink-0"
                            aria-hidden="true"
                        >
                            {/* Left Column (3 circles) */}
                            <circle cx="5" cy="4" r="1.6" fill="currentColor" />
                            <circle cx="5" cy="9" r="1.6" fill="currentColor" />
                            <circle
                                cx="5"
                                cy="14"
                                r="1.6"
                                fill="currentColor"
                            />

                            {/* Right Column (3 circles) */}
                            <circle
                                cx="13"
                                cy="4"
                                r="1.6"
                                fill="currentColor"
                            />
                            <circle
                                cx="13"
                                cy="9"
                                r="1.6"
                                fill="currentColor"
                            />
                            <circle
                                cx="13"
                                cy="14"
                                r="1.6"
                                fill="currentColor"
                            />
                        </svg>
                        <span>Browse Category</span>
                    </button>

                    {/* Desktop Nav Links */}
                    <ul className="flex items-center gap-6 xl:gap-8 text-[14px] font-medium list-none m-0 p-0">
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

                    {/* Desktop Search Field */}
                    <form
                        role="search"
                        action="/search"
                        method="GET"
                        className="flex items-center border border-border-default rounded-full px-3.5 py-1.5 w-48 xl:w-60 bg-bg-base transition-colors"
                    >
                        <input
                            type="search"
                            name="q"
                            placeholder="Search..."
                            className="w-full bg-transparent outline-none text-[13px] text-text-primary placeholder:text-text-secondary"
                        />
                        <button
                            type="submit"
                            aria-label="Submit Search"
                            className="ml-1 cursor-pointer"
                        >
                            <Image
                                src="/icons/search.svg"
                                alt=""
                                width={15}
                                height={15}
                                aria-hidden="true"
                                className="opacity-70 hover:opacity-100"
                            />
                        </button>
                    </form>

                    {/* Login / Sign Up Button */}
                    <Link
                        href="/auth/login"
                        className="bg-brand-primary hover:bg-brand-hover text-white text-[13px] font-semibold px-4 py-2 rounded transition-colors whitespace-nowrap"
                    >
                        Login / Sign Up
                    </Link>
                </div>
            </nav>

            {/* ================= 4. Mobile & Tablet Slide-over Drawer ================= */}
            <div
                className={`lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity duration-300 ${
                    isMobileMenuOpen
                        ? "opacity-100 visible"
                        : "opacity-0 invisible"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
            >
                <div
                    className={`fixed top-0 left-0 bottom-0 w-70 sm:w-80 bg-bg-base border-r border-border-default p-5 flex flex-col justify-between overflow-y-auto transition-transform duration-300 ${
                        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col gap-6">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-border-default">
                            <span className="text-sm font-semibold text-text-primary">
                                Menu
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-1.5 rounded-full hover:bg-bg-subtle text-text-secondary"
                                aria-label="Close menu"
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
                        <button
                            type="button"
                            className="w-full flex items-center justify-center gap-2 bg-brand-primary text-white text-sm font-semibold py-2.5 rounded"
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                            >
                                <rect x="1" y="1" width="5" height="5" rx="1" />
                                <rect
                                    x="10"
                                    y="1"
                                    width="5"
                                    height="5"
                                    rx="1"
                                />
                                <rect
                                    x="1"
                                    y="10"
                                    width="5"
                                    height="5"
                                    rx="1"
                                />
                                <rect
                                    x="10"
                                    y="10"
                                    width="5"
                                    height="5"
                                    rx="1"
                                />
                            </svg>
                            <span>Browse Category</span>
                        </button>

                        {/* Navigation List */}
                        <nav className="flex flex-col gap-1 text-[15px] font-medium">
                            <Link
                                href="/"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="px-3 py-2 rounded-md text-brand-primary hover:bg-bg-subtle"
                            >
                                Home
                            </Link>
                            <Link
                                href="/shop"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="px-3 py-2 rounded-md text-text-primary hover:bg-bg-subtle"
                            >
                                Shop
                            </Link>

                            {/* Collapsible: Pages */}
                            <div>
                                <button
                                    type="button"
                                    onClick={() => toggleDropdown("pages")}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-md text-text-primary hover:bg-bg-subtle"
                                >
                                    <span>Pages</span>
                                    <svg
                                        width="10"
                                        height="6"
                                        viewBox="0 0 10 6"
                                        fill="none"
                                        className={`stroke-current stroke-[1.5] transition-transform ${
                                            openDropdown === "pages"
                                                ? "rotate-180"
                                                : ""
                                        }`}
                                    >
                                        <path d="M1 1L5 5L9 1" />
                                    </svg>
                                </button>
                                {openDropdown === "pages" && (
                                    <div className="pl-6 flex flex-col gap-1 py-1 text-sm text-text-secondary">
                                        <Link
                                            href="/faq"
                                            onClick={() =>
                                                setIsMobileMenuOpen(false)
                                            }
                                            className="py-1 hover:text-brand-primary"
                                        >
                                            FAQ
                                        </Link>
                                        <Link
                                            href="/terms"
                                            onClick={() =>
                                                setIsMobileMenuOpen(false)
                                            }
                                            className="py-1 hover:text-brand-primary"
                                        >
                                            Terms of Service
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* Collapsible: Blog */}
                            <div>
                                <button
                                    type="button"
                                    onClick={() => toggleDropdown("blog")}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-md text-text-primary hover:bg-bg-subtle"
                                >
                                    <span>Blog</span>
                                    <svg
                                        width="10"
                                        height="6"
                                        viewBox="0 0 10 6"
                                        fill="none"
                                        className={`stroke-current stroke-[1.5] transition-transform ${
                                            openDropdown === "blog"
                                                ? "rotate-180"
                                                : ""
                                        }`}
                                    >
                                        <path d="M1 1L5 5L9 1" />
                                    </svg>
                                </button>
                                {openDropdown === "blog" && (
                                    <div className="pl-6 flex flex-col gap-1 py-1 text-sm text-text-secondary">
                                        <Link
                                            href="/blog"
                                            onClick={() =>
                                                setIsMobileMenuOpen(false)
                                            }
                                            className="py-1 hover:text-brand-primary"
                                        >
                                            Latest Articles
                                        </Link>
                                    </div>
                                )}
                            </div>

                            <Link
                                href="/about"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="px-3 py-2 rounded-md text-text-primary hover:bg-bg-subtle"
                            >
                                About Us
                            </Link>
                            <Link
                                href="/contact"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="px-3 py-2 rounded-md text-text-primary hover:bg-bg-subtle"
                            >
                                Contact
                            </Link>
                            <Link
                                href="/wishlist"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="sm:hidden px-3 py-2 rounded-md text-text-primary hover:bg-bg-subtle flex items-center justify-between"
                            >
                                <span>Wishlist</span>
                                <span className="bg-brand-primary text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                    2
                                </span>
                            </Link>
                        </nav>
                    </div>

                    {/* Drawer Bottom Action */}
                    <div className="pt-4 border-t border-border-default flex flex-col gap-3">
                        <Link
                            href="/auth/login"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="w-full text-center bg-brand-primary text-white text-sm font-semibold py-2.5 rounded hover:bg-brand-hover transition-colors"
                        >
                            Login / Sign Up
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
}
