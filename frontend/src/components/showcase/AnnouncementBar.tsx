import Link from "next/link";
import type { ShowcaseContent } from "@/lib/showcase";
import { cn } from "@/lib/utils";

const TONES = {
    brand: "bg-sc-accent text-sc-on-accent",
    info: "bg-info text-white",
    success: "bg-brand-primary text-white",
    warning: "bg-warning text-[#1A1A1A]",
} as const;

function isSafeHref(href: string) {
    return href.startsWith("https://") || (href.startsWith("/") && !href.startsWith("//"));
}

export function AnnouncementBar({ announcement }: { announcement: ShowcaseContent["announcement"] }) {
    if (!announcement?.text) return null;
    const href = announcement.link && isSafeHref(announcement.link) ? announcement.link : null;

    const body = <span className="font-medium">{announcement.text}</span>;

    return (
        <div role="region" aria-label={announcement.text} className={cn("w-full text-center text-[13px]", TONES[announcement.tone])}>
            <div className="container mx-auto px-4 py-2.5 sm:px-6">
                {href ? (
                    href.startsWith("/") ? (
                        <Link href={href} className="underline-offset-4 hover:underline">
                            {body} <span aria-hidden="true">→</span>
                        </Link>
                    ) : (
                        <a href={href} rel="noopener noreferrer" target="_blank" className="underline-offset-4 hover:underline">
                            {body} <span aria-hidden="true">↗</span>
                        </a>
                    )
                ) : (
                    body
                )}
            </div>
        </div>
    );
}
