import Link from "next/link";

export default function ShopBreadcrumb() {
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
                            Shop
                        </span>
                    </li>
                </ol>
            </div>
        </nav>
    );
}
