import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import TopBrandsSection from "@/components/home/TopBrandsSection";

const INTRO_COPY =
    "Pellentesque ultrices, dui vel hendrerit iaculis, ipsum velit vestibulum libero, sit amet mattis diam justo. Nullam non mauris ipsum. Nulla facilisi. Duis aliquet, nisl ut tincidunt tincidunt.";

const FEATURES = [
    "Research beyond the business plan",
    "Marketing options and rates",
    "The ability to turnaround consulting",
    "Customer engagement matters",
] as const;

const ACHIEVEMENTS = [
    {
        value: "05+",
        label: "Years Service",
        icon: YearsIcon,
    },
    {
        value: "100+",
        label: "Expert Team members",
        icon: TeamIcon,
    },
    {
        value: "90%",
        label: "Success Rate",
        icon: SuccessIcon,
    },
    {
        value: "800+",
        label: "Happy Customers",
        icon: CustomersIcon,
    },
] as const;

const TEAM_IMAGES = [
    {
        src: "/images/about/team-1.jpg",
        alt: "Team collaborating in the office",
    },
    {
        src: "/images/about/team-2.jpg",
        alt: "Team discussing project plans",
    },
    {
        src: "/images/about/team-3.jpg",
        alt: "Team workshop session",
    },
    {
        src: "/images/about/team-4.jpg",
        alt: "Leadership meeting with the team",
    },
] as const;

function AboutBreadcrumb() {
    return (
        <nav
            aria-label="Breadcrumb"
            className="w-full border-b border-border-default bg-bg-subtle/60"
        >
            <div className="container mx-auto px-4 sm:px-6 py-3.5">
                <ol className="flex items-center gap-2 text-[13px] list-none m-0 p-0">
                    <li>
                        <Link
                            href="/"
                            className="text-text-secondary hover:text-brand-primary transition-colors"
                        >
                            Home
                        </Link>
                    </li>
                    <li aria-hidden="true" className="text-text-secondary">
                        &gt;
                    </li>
                    <li>
                        <span
                            aria-current="page"
                            className="text-text-primary font-medium"
                        >
                            About Us
                        </span>
                    </li>
                </ol>
            </div>
        </nav>
    );
}

function CheckIcon() {
    return (
        <span
            aria-hidden="true"
            className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white"
        >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                    d="M2.5 6.2 4.8 8.5 9.5 3.5"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </span>
    );
}

function FeatureList() {
    return (
        <ul className="m-0 mt-5 flex list-none flex-col gap-3 p-0">
            {FEATURES.map((item) => (
                <li
                    key={item}
                    className="flex items-start gap-3 text-[14px] leading-snug text-text-secondary"
                >
                    <CheckIcon />
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    );
}

function SectionHeading({
    id,
    children,
    accent,
}: {
    id?: string;
    children: ReactNode;
    accent?: string;
}) {
    return (
        <h2
            id={id}
            className="m-0 text-[26px] font-semibold leading-tight text-text-primary sm:text-[30px] lg:text-[32px]"
        >
            {children}
            {accent ? (
                <>
                    {" "}
                    <span className="text-brand-primary">{accent}</span>
                </>
            ) : null}
        </h2>
    );
}

function YearsIcon() {
    return (
        <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
            className="text-brand-primary"
        >
            <circle
                cx="20"
                cy="14"
                r="6"
                stroke="currentColor"
                strokeWidth="1.75"
            />
            <path
                d="M8 32c1.8-6 5.5-9 12-9s10.2 3 12 9"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
            />
        </svg>
    );
}

function TeamIcon() {
    return (
        <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
            className="text-brand-primary"
        >
            <path
                d="M20 8.5 23.2 15l7.3.8-5.4 4.9 1.5 7.2L20 24.8l-6.6 3.1 1.5-7.2-5.4-4.9 7.3-.8L20 8.5Z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function SuccessIcon() {
    return (
        <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
            className="text-brand-primary"
        >
            <rect
                x="9"
                y="8"
                width="22"
                height="24"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.75"
            />
            <path
                d="M14 16h12M14 21h12M14 26h7"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
            />
        </svg>
    );
}

function CustomersIcon() {
    return (
        <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
            className="text-brand-primary"
        >
            <circle
                cx="20"
                cy="20"
                r="10"
                stroke="currentColor"
                strokeWidth="1.75"
            />
            <path
                d="M14.5 21.5c1.2 2.4 3.1 3.7 5.5 3.7s4.3-1.3 5.5-3.7"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
            />
            <circle cx="15.8" cy="17.2" r="1.2" fill="currentColor" />
            <circle cx="24.2" cy="17.2" r="1.2" fill="currentColor" />
        </svg>
    );
}

export default function AboutPageContent() {
    return (
        <div className="w-full bg-bg-base">
            <AboutBreadcrumb />

            {/* Intro */}
            <section
                aria-labelledby="about-intro-heading"
                className="container mx-auto px-4 sm:px-6 py-8 sm:py-10 lg:py-12"
            >
                <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-bg-subtle">
                        <Image
                            src="/images/about/hero.jpg"
                            alt="Retail Market team collaborating in a meeting"
                            fill
                            priority
                            sizes="(max-width: 1024px) 100vw, 50vw"
                            className="object-cover"
                        />
                    </div>

                    <div>
                        <SectionHeading
                            id="about-intro-heading"
                            accent="True News"
                        >
                            More Than 25+ Years We Provide
                        </SectionHeading>
                        <p className="mt-4 m-0 text-[14px] leading-relaxed text-text-secondary sm:text-[15px]">
                            {INTRO_COPY}
                        </p>
                        <FeatureList />
                    </div>
                </div>
            </section>

            {/* Achievements */}
            <section
                aria-labelledby="about-achievements-heading"
                className="w-full border-y border-border-default bg-bg-subtle/50"
            >
                <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-12 lg:py-14">
                    <div className="mx-auto max-w-2xl text-center">
                        <h2
                            id="about-achievements-heading"
                            className="m-0 text-[24px] font-semibold text-text-primary sm:text-[28px]"
                        >
                            Some of our achievements
                        </h2>
                        <p className="mt-3 m-0 text-[14px] leading-relaxed text-text-secondary">
                            Pellentesque ultrices, dui vel hendrerit iaculis,
                            ipsum velit vestibulum libero, sit amet mattis diam
                            justo.
                        </p>
                    </div>

                    <ul className="mt-10 grid list-none grid-cols-2 gap-6 m-0 p-0 lg:grid-cols-4 lg:gap-8">
                        {ACHIEVEMENTS.map((item) => {
                            const Icon = item.icon;
                            return (
                                <li
                                    key={item.label}
                                    className="flex flex-col items-center text-center"
                                >
                                    <Icon />
                                    <p className="mt-3 m-0 text-[28px] font-bold leading-none text-text-primary sm:text-[32px]">
                                        {item.value}
                                    </p>
                                    <p className="mt-2 m-0 text-[13px] text-text-secondary sm:text-[14px]">
                                        {item.label}
                                    </p>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </section>

            {/* CEO message */}
            <section
                aria-labelledby="about-ceo-heading"
                className="container mx-auto px-4 sm:px-6 py-8 sm:py-10 lg:py-12"
            >
                <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
                    <div className="order-2 lg:order-1">
                        <h2
                            id="about-ceo-heading"
                            className="m-0 text-[24px] font-semibold text-text-primary sm:text-[28px] lg:text-[30px]"
                        >
                            Message from the CEO
                        </h2>
                        <p className="mt-4 m-0 text-[14px] leading-relaxed text-text-secondary sm:text-[15px]">
                            {INTRO_COPY}
                        </p>
                        <FeatureList />
                    </div>

                    <div className="relative order-1 aspect-[4/3] w-full overflow-hidden rounded-md bg-bg-subtle lg:order-2">
                        <Image
                            src="/images/about/ceo.jpg"
                            alt="Message from the CEO"
                            fill
                            sizes="(max-width: 1024px) 100vw, 50vw"
                            className="object-cover"
                        />
                    </div>
                </div>
            </section>

            {/* Team members */}
            <section
                aria-labelledby="about-team-heading"
                className="container mx-auto px-4 sm:px-6 py-8 sm:py-10 lg:py-12"
            >
                <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        {TEAM_IMAGES.map((image) => (
                            <div
                                key={image.src}
                                className="relative aspect-[4/3] overflow-hidden rounded-md bg-bg-subtle"
                            >
                                <Image
                                    src={image.src}
                                    alt={image.alt}
                                    fill
                                    sizes="(max-width: 1024px) 50vw, 25vw"
                                    className="object-cover"
                                />
                            </div>
                        ))}
                    </div>

                    <div>
                        <h2
                            id="about-team-heading"
                            className="m-0 text-[24px] font-semibold text-text-primary sm:text-[28px] lg:text-[30px]"
                        >
                            About team members
                        </h2>
                        <p className="mt-4 m-0 text-[14px] leading-relaxed text-text-secondary sm:text-[15px]">
                            {INTRO_COPY}
                        </p>
                        <FeatureList />
                    </div>
                </div>
            </section>

            <TopBrandsSection />
        </div>
    );
}
