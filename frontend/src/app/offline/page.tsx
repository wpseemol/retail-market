import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/i18n/server";

export const metadata: Metadata = {
    title: "Offline",
    robots: { index: false, follow: false },
};

export default async function OfflinePage() {
    const t = await getDictionary();

    return (
        <main className="container mx-auto flex min-h-[50vh] flex-col items-center justify-center px-4 py-20 text-center">
            <h1 className="m-0 text-2xl font-semibold text-text-primary">{t.offline.title}</h1>
            <p className="mt-3 max-w-md text-[15px] text-text-secondary">{t.offline.body}</p>
            <Link
                href="/"
                className="mt-6 inline-flex min-h-11 items-center rounded-full bg-brand-primary px-5 text-sm font-semibold text-white"
            >
                {t.offline.home}
            </Link>
        </main>
    );
}
