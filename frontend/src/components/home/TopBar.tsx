"use client";

import React from "react";
import Image from "next/image";
import { useAppSelector } from "@/store/hooks";
import { selectSiteChrome } from "@/store/siteChromeSlice";

export default function TopBar() {
    const chrome = useAppSelector(selectSiteChrome);
    const email = chrome.topbarEmail || "retailmarket@gmail.com";
    const phone = chrome.topbarPhone || "+1(213)628-3034";
    const social = chrome.social;
    return (
        <header className="w-full h-12 bg-bg-base border-b border-border-default transition-colors duration-200">
            <div className="container h-full mx-auto flex items-center justify-between gap-2 overflow-hidden">
                {/* Left Section: Deliver to & Date */}
                <div className="flex items-center gap-4 sm:gap-13.5 shrink-0 min-w-0">
                    {/* Deliver To Block */}
                    <div className="flex items-center gap-2 min-w-0">
                        <Image
                            src="/icons/Map Pin.svg"
                            alt="Location Pin"
                            width={15}
                            height={18}
                            className="shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] leading-[130%] text-text-secondary">
                                Deliver to
                            </span>
                            <div className="flex items-center gap-1">
                                {/* Responsive Flag Circle */}
                                <div className="w-3.5 h-3.5 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                                    {/* Shows USA on Light Mode */}
                                    <svg
                                        viewBox="0 0 16 16"
                                        className="w-full h-full block dark:hidden"
                                    >
                                        <rect
                                            width="16"
                                            height="16"
                                            fill="#F7FCFF"
                                        />
                                        <path
                                            d="M0 2h16v1.5H0zm0 3h16v1.5H0zm0 3h16v1.5H0zm0 3h16v1.5H0zm0 3h16v1.5H0z"
                                            fill="#E31D1C"
                                        />
                                        <rect
                                            width="7"
                                            height="8"
                                            fill="#2E42A5"
                                        />
                                    </svg>
                                    {/* Shows China on Dark Mode */}
                                    <svg
                                        viewBox="0 0 16 16"
                                        className="w-full h-full hidden dark:block"
                                    >
                                        <rect
                                            width="16"
                                            height="16"
                                            fill="#E31D1C"
                                        />
                                        <polygon
                                            points="3,2 3.5,3.3 5,3.3 3.8,4.2 4.2,5.5 3,4.6 1.8,5.5 2.2,4.2 1,3.3 2.5,3.3"
                                            fill="#FECA00"
                                        />
                                        <circle
                                            cx="6"
                                            cy="2"
                                            r="0.4"
                                            fill="#FECA00"
                                        />
                                        <circle
                                            cx="7"
                                            cy="3.5"
                                            r="0.4"
                                            fill="#FECA00"
                                        />
                                        <circle
                                            cx="7"
                                            cy="5"
                                            r="0.4"
                                            fill="#FECA00"
                                        />
                                        <circle
                                            cx="6"
                                            cy="6.5"
                                            r="0.4"
                                            fill="#FECA00"
                                        />
                                    </svg>
                                </div>

                                <span className="text-[14px] font-semibold leading-[120%] text-text-secondary">
                                    <span className="inline dark:hidden">
                                        USA
                                    </span>
                                    <span className="hidden dark:inline">
                                        China
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Calendar Date Block */}
                    <div className="hidden sm:flex items-center gap-1.5">
                        <Image
                            src="/icons/CalendarBlank.svg"
                            alt="Calendar"
                            width={19}
                            height={19}
                            className="shrink-0"
                        />
                        <span className="text-[14px] leading-[120%] text-text-secondary">
                            Friday - Jul 22, 2024
                        </span>
                    </div>
                </div>

                {/* Right Section: Email, Phone, Currency, Language, Social Media */}
                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                    {/* Email */}
                    <div className="hidden md:flex items-center gap-1">
                        <Image
                            src="/icons/Envelope.svg"
                            alt="Email"
                            width={20}
                            height={20}
                            className="shrink-0"
                        />
                        <a
                            href={`mailto:${email}`}
                            className="text-[12px] leading-[120%] text-text-secondary hover:text-brand-primary transition-colors"
                        >
                            {email}
                        </a>
                    </div>

                    <span className="hidden md:inline-block w-px h-3.75 bg-border-default" />

                    {/* Phone */}
                    <div className="hidden lg:flex items-center gap-2">
                        <Image
                            src="/icons/Group.svg"
                            alt="Phone"
                            width={18}
                            height={18}
                            className="shrink-0"
                        />
                        <a
                            href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                            className="text-[12px] leading-[120%] text-text-secondary hover:text-brand-primary transition-colors"
                        >
                            {phone}
                        </a>
                    </div>

                    <span className="hidden lg:inline-block w-px h-3.75 bg-border-default" />

                    {/* Language Selector */}
                    <div className="flex items-center gap-1.5 px-px py-0.5 rounded bg-transparent dark:bg-bg-surface cursor-pointer text-text-secondary hover:text-brand-primary transition-colors">
                        <span className="text-[12px] leading-[130%]">Eng</span>
                        <svg
                            width="7"
                            height="4"
                            viewBox="0 0 7 4"
                            fill="none"
                            className="stroke-current"
                        >
                            <path
                                d="M0.5 0.5L3.5 3.5L6.5 0.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>

                    <span className="inline-block w-px h-3.75 bg-border-default" />

                    {/* Currency Selector */}
                    <div className="flex items-center gap-1.5 px-px py-0.5 rounded bg-transparent dark:bg-bg-surface cursor-pointer text-text-secondary hover:text-brand-primary transition-colors">
                        <span className="text-[12px] leading-[130%]">BDT</span>
                        <svg
                            width="7"
                            height="4"
                            viewBox="0 0 7 4"
                            fill="none"
                            className="stroke-current"
                        >
                            <path
                                d="M0.5 0.5L3.5 3.5L6.5 0.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>

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
                                    className="opacity-80 hover:opacity-100 hover:scale-110 transition-transform"
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
