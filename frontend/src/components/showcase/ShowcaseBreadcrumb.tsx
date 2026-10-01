import Link from "next/link";

export type Crumb = { name: string; href?: string };

export function ShowcaseBreadcrumb({ items, label }: { items: Crumb[]; label: string }) {
    return (
        <nav aria-label={label} className="w-full border-b border-border-default bg-bg-subtle/60">
            <div className="container mx-auto px-4 py-3.5 sm:px-6">
                <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 text-[13px]">
                    {items.map((item, index) => (
                        <li key={`${item.name}-${index}`} className="flex items-center gap-2">
                            {index > 0 ? (
                                <span aria-hidden="true" className="text-text-secondary">
                                    /
                                </span>
                            ) : null}
                            {item.href ? (
                                <Link
                                    href={item.href}
                                    className="text-text-secondary hover:text-sc-accent-text"
                                >
                                    {item.name}
                                </Link>
                            ) : (
                                <span aria-current="page" className="font-medium text-text-primary">
                                    {item.name}
                                </span>
                            )}
                        </li>
                    ))}
                </ol>
            </div>
        </nav>
    );
}
