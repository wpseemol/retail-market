import React from "react";
import Image from "next/image";

export default function TopBar() {
    return (
        <header className="w-full h-12 bg-bg-base border-b border-border-default transition-colors duration-200">
            <div className="container h-full mx-auto flex items-center justify-between">
                {/* Left Section: Deliver to & Date */}
                <div className="flex items-center gap-13.5">
                    {/* Deliver To Block */}
                    <div className="flex items-center gap-2">
                        <Image
                            src="/icons/Map Pin.svg"
                            alt="Location Pin"
                            width={15}
                            height={18}
                            className="shrink-0"
                        />
                        <div className="flex flex-col">
                            <span className="text-[10px] leading-[130%] text-text-secondary">
                                Deliver to
                            </span>
                            <div className="flex items-center gap-1">
                                {/* Responsive Flag Circle */}
                                <div className="w-[14px] h-[14px] rounded-full overflow-hidden flex items-center justify-center shrink-0">
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
                                        Chine
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Calendar Date Block */}
                    <div className="hidden sm:flex items-center gap-[6px]">
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
                <div className="flex items-center gap-[10px]">
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
                            href="mailto:retailmarket@gmail.com"
                            className="text-[12px] leading-[120%] text-text-secondary hover:text-brand-primary transition-colors"
                        >
                            retailmarket@gmail.com
                        </a>
                    </div>

                    <span className="hidden md:inline-block w-[1px] h-[15px] bg-border-default" />

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
                            href="tel:+12136283034"
                            className="text-[12px] leading-[120%] text-text-secondary hover:text-brand-primary transition-colors"
                        >
                            +1(213)628-3034
                        </a>
                    </div>

                    <span className="hidden lg:inline-block w-[1px] h-[15px] bg-border-default" />

                    {/* Language Selector */}
                    <div className="flex items-center gap-[6px] px-1 py-[2px] rounded bg-transparent dark:bg-bg-surface cursor-pointer text-text-secondary hover:text-brand-primary transition-colors">
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

                    <span className="inline-block w-[1px] h-[15px] bg-border-default" />

                    {/* Currency Selector */}
                    <div className="flex items-center gap-[6px] px-1 py-[2px] rounded bg-transparent dark:bg-bg-surface cursor-pointer text-text-secondary hover:text-brand-primary transition-colors">
                        <span className="text-[12px] leading-[130%]">USD</span>
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

                    <span className="inline-block w-[1px] h-[15px] bg-border-default" />

                    {/* Social Media Icons */}
                    <div className="flex items-center gap-2">
                        <a
                            href="https://facebook.com"
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Facebook"
                            className="opacity-80 hover:opacity-100 hover:scale-110 transition-transform"
                        >
                            <Image
                                src="/icons/fb.svg"
                                alt="Facebook"
                                width={16}
                                height={16}
                                className="brightness-0 dark:invert"
                            />
                        </a>

                        <a
                            href="https://x.com"
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Twitter X"
                            className="opacity-80 hover:opacity-100 hover:scale-110 transition-transform"
                        >
                            <Image
                                src="/icons/Twitter X.svg"
                                alt="Twitter X"
                                width={16}
                                height={16}
                                className="brightness-0 dark:invert"
                            />
                        </a>

                        <a
                            href="https://youtube.com"
                            target="_blank"
                            rel="noreferrer"
                            aria-label="YouTube"
                            className="opacity-80 hover:opacity-100 hover:scale-110 transition-transform"
                        >
                            <Image
                                src="/icons/youtube.svg"
                                alt="YouTube"
                                width={16}
                                height={16}
                                className="brightness-0 dark:invert"
                            />
                        </a>

                        <a
                            href="https://linkedin.com"
                            target="_blank"
                            rel="noreferrer"
                            aria-label="LinkedIn"
                            className="opacity-80 hover:opacity-100 hover:scale-110 transition-transform"
                        >
                            <Image
                                src="/icons/linkedIn.svg"
                                alt="LinkedIn"
                                width={16}
                                height={16}
                                className="brightness-0 dark:invert"
                            />
                        </a>

                        <a
                            href="https://instagram.com"
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Instagram"
                            className="opacity-80 hover:opacity-100 hover:scale-110 transition-transform"
                        >
                            <Image
                                src="/icons/insta.svg"
                                alt="Instagram"
                                width={16}
                                height={16}
                                className="brightness-0 dark:invert"
                            />
                        </a>
                    </div>
                </div>
            </div>
        </header>
    );
}
