import React from "react";
import Image from "next/image";
import Link from "next/link";

interface FooterLink {
    label: string;
    href: string;
}

const findItFastLinks: FooterLink[] = [
    { label: "Laptops & Computers", href: "/category/laptops" },
    { label: "Cameras & Photography", href: "/category/cameras" },
    { label: "Smart Phones & Tablets", href: "/category/smartphones" },
    { label: "Video Games & Consoles", href: "/category/gaming" },
    { label: "TV & Audio", href: "/category/tv-audio" },
    { label: "Gadgets", href: "/category/gadgets" },
    { label: "Waterproof Headphones", href: "/category/headphones" },
    { label: "Quick Links", href: "/quick-links" },
];

const customerCareLinks: FooterLink[] = [
    { label: "My Account", href: "/account" },
    { label: "Track Your Order", href: "/track-order" },
    { label: "Wishlist", href: "/wishlist" },
    { label: "Customer Service", href: "/customer-service" },
    { label: "Returns/Exchange", href: "/returns" },
    { label: "FAQ", href: "/faq" },
    { label: "Product Support", href: "/support" },
];

const weeklySelectedProducts = [
    {
        id: 1,
        title: "Smart Watch for Men Women",
        price: "$197",
        image: "/images/bottom_banner_left_product.png",
    },
    {
        id: 2,
        title: "Apple iPhone 14 Pro Max, 256GB",
        price: "$891",
        image: "/images/Leatest Item (3).png",
    },
    {
        id: 3,
        title: "Surface Laptop Touchscreen",
        price: "$1,510",
        image: "/images/Deals of The Day product center 1.png",
    },
    {
        id: 4,
        title: "Bearway Super Console x2",
        price: "$118",
        image: "/images/buttom_right_product.png",
    },
    {
        id: 5,
        title: "OneOdio Wired Headphones",
        price: "$149",
        image: "/images/Leatest Item (5).png",
    },
    {
        id: 6,
        title: "Microsoft Surface Pro 9 Tablet",
        price: "$791",
        image: "/images/Deals of The Day product center 4.png",
    },
];

export default function Footer() {
    const currentYear = 2026;

    return (
        <footer className="w-full bg-bg-surface border-t border-border-default pt-12 pb-6 transition-colors duration-200">
            <div className="container mx-auto px-4 sm:px-6">
                {/* ================= Top Section: 4 Columns ================= */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-12">
                    {/* Column 1: Brand, Description, Contact, Apps (Col span 4) */}
                    <div className="lg:col-span-4 flex flex-col items-start">
                        {/* Dark / Light Mode Logo Toggle */}
                        <Link href="/" className="inline-block mb-4">
                            <Image
                                src="/logo/niyenin-white.png"
                                alt="Niyenin Logo"
                                width={180}
                                height={50}
                                className="object-contain dark:hidden"
                            />
                            <Image
                                src="/logo/niyenin-dark.png"
                                alt="Niyenin Logo"
                                width={180}
                                height={50}
                                className="object-contain hidden dark:block"
                            />
                        </Link>

                        <p className="text-text-secondary text-sm leading-relaxed mb-6 max-w-sm">
                            Phasellus justo ligula, dictum sit amet tortor eu,
                            iaculis tristique turpis. Mauris non orci sed est
                            suscipit tempor ut quis felis. Praesent pellentesque
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
                                    Got Question? Call Us 24/7!
                                </span>
                                <span className="text-text-primary text-[19px] font-bold tracking-tight">
                                    +1(000)000-000
                                </span>
                            </div>
                        </div>

                        {/* App Store Buttons */}
                        <div className="flex items-center gap-3">
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
                                        Get it on
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
                                        Download on the
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
                            Find It Fast
                        </h3>
                        <ul className="flex flex-col gap-3 list-none p-0 m-0">
                            {findItFastLinks.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-text-secondary hover:text-brand-primary text-[14px] transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 3: Customer Care (Col span 2) */}
                    <div className="lg:col-span-2 flex flex-col">
                        <h3 className="text-[#00B207] text-[15px] font-bold uppercase tracking-wider mb-5">
                            Customer Care
                        </h3>
                        <ul className="flex flex-col gap-3 list-none p-0 m-0">
                            {customerCareLinks.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-text-secondary hover:text-brand-primary text-[14px] transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 4: Weekly Selected (Col span 4) */}
                    <div className="lg:col-span-4 flex flex-col">
                        <h3 className="text-[#00B207] text-[15px] font-bold uppercase tracking-wider mb-5">
                            Weekly Selected
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                            {weeklySelectedProducts.map((product) => (
                                <Link
                                    key={product.id}
                                    href={`/shop/product/${product.id}`}
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
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 py-6 border-t border-border-default/60">
                    {/* Copyright */}
                    <p className="text-text-secondary text-[13px]">
                        Copyright &copy; {currentYear}.{" "}
                        <strong className="text-[#00B207] font-semibold">
                            Niyenin
                        </strong>
                        . All Rights Reserved.
                    </p>

                    {/* Social Icons */}
                    <div className="flex items-center gap-5 text-text-primary">
                        {/* Facebook */}
                        <Link
                            href="#"
                            aria-label="Facebook"
                            className="hover:text-brand-primary transition-colors"
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                            </svg>
                        </Link>
                        {/* X (Twitter) */}
                        <Link
                            href="#"
                            aria-label="X Twitter"
                            className="hover:text-brand-primary transition-colors"
                        >
                            <svg
                                width="17"
                                height="17"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                        </Link>
                        {/* YouTube */}
                        <Link
                            href="#"
                            aria-label="YouTube"
                            className="hover:text-brand-primary transition-colors"
                        >
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33zM9.75 15.02V8.48l6.5 3.27-6.5 3.27z" />
                            </svg>
                        </Link>
                        {/* LinkedIn */}
                        <Link
                            href="#"
                            aria-label="LinkedIn"
                            className="hover:text-brand-primary transition-colors"
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
                                <circle cx="4" cy="4" r="2" />
                            </svg>
                        </Link>
                        {/* Instagram */}
                        <Link
                            href="#"
                            aria-label="Instagram"
                            className="hover:text-brand-primary transition-colors"
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <rect
                                    x="2"
                                    y="2"
                                    width="20"
                                    height="20"
                                    rx="5"
                                    ry="5"
                                />
                                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                            </svg>
                        </Link>
                    </div>

                    {/* Payment Providers */}
                    <div className="flex items-center gap-2">
                        <span className="w-10 h-6 bg-[#FF5F00] text-white rounded-[3px] flex items-center justify-center font-bold text-[8px] italic">
                            Master
                        </span>
                        <span className="w-10 h-6 bg-[#00AEEF] text-white rounded-[3px] flex items-center justify-center font-bold text-[8px]">
                            AMEX
                        </span>
                        <span className="w-10 h-6 bg-[#1A1F71] text-white rounded-[3px] flex items-center justify-center font-bold text-[10px] italic">
                            VISA
                        </span>
                        <span className="w-10 h-6 bg-[#E55C20] text-white rounded-[3px] flex items-center justify-center font-bold text-[7px] uppercase tracking-tighter">
                            Discover
                        </span>
                        <span className="w-10 h-6 bg-[#003087] text-white rounded-[3px] flex items-center justify-center font-bold text-[9px] italic">
                            PayPal
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
