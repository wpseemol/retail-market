import Link from "next/link";

export default function NotFoundContent() {
    return (
        <div className="w-full bg-bg-base">
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
                                404
                            </span>
                        </li>
                    </ol>
                </div>
            </nav>

            <div className="container mx-auto px-4 sm:px-6">
                <div className="flex flex-col items-center justify-center text-center py-16 sm:py-20 lg:py-24">
                    <p
                        aria-hidden="true"
                        className="m-0 font-bold leading-none tracking-tight text-[100px] sm:text-[140px] lg:text-[180px] text-[#E8E8E8] dark:text-[#2F2F35] select-none"
                    >
                        404
                    </p>

                    <h1 className="m-0 mt-2 sm:mt-0 text-[22px] sm:text-[28px] lg:text-[32px] font-semibold text-text-primary leading-snug">
                        Oops... It looks like you&apos;re lost !
                    </h1>

                    <p className="m-0 mt-3 sm:mt-4 max-w-md text-[14px] sm:text-[15px] text-text-secondary leading-relaxed">
                        Oops! The page you are looking for does not exist. It
                        might have been moved or deleted.
                    </p>

                    <Link
                        href="/"
                        className="mt-8 sm:mt-10 inline-flex items-center gap-2.5 h-11 sm:h-12 px-7 sm:px-8 rounded-md border-2 border-brand-primary bg-transparent text-brand-primary dark:text-white hover:bg-brand-primary hover:text-white text-[13px] sm:text-[14px] font-bold uppercase tracking-wide transition-colors"
                    >
                        Go Back Home
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                            className="shrink-0"
                        >
                            <path
                                d="M5 12h14M13 6l6 6-6 6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    );
}
