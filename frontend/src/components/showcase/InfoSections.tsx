import type { Dictionary } from "@/i18n/dictionaries";
import { format } from "@/i18n/config";
import type { ShowcaseContent, SocialKey } from "@/lib/showcase";
import { SectionHeading } from "./ProductSections";

type T = Dictionary["showcase"];

function Paragraphs({ text }: { text: string }) {
    return (
        <div className="space-y-3 text-[15px] leading-relaxed text-text-secondary">
            {text
                .split(/\n{2,}/)
                .map((block) => block.trim())
                .filter(Boolean)
                .map((block, index) => (
                    <p key={index} className="whitespace-pre-line">
                        {block}
                    </p>
                ))}
        </div>
    );
}

export function AboutSection({ text, name, t }: { text: string | null; name: string; t: T }) {
    if (!text?.trim()) return null;
    return (
        <section aria-labelledby="about-heading" className="rounded-2xl border border-border-default bg-bg-surface p-6 sm:p-8">
            <div id="about-heading">
                <SectionHeading title={format(t.about, { name })} />
            </div>
            <div className="max-w-3xl">
                <Paragraphs text={text} />
            </div>
        </section>
    );
}

const SOCIAL_ORDER: SocialKey[] = ["facebook", "instagram", "youtube", "tiktok", "x", "website"];

const SOCIAL_ICONS: Record<SocialKey, string> = {
    facebook: "M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.3H8v3h2.6V21h2.9z",
    instagram:
        "M12 7.4a4.6 4.6 0 100 9.2 4.6 4.6 0 000-9.2zm0 7.6a3 3 0 110-6 3 3 0 010 6zm4.8-8.9a1.1 1.1 0 100 2.2 1.1 1.1 0 000-2.2zM21 7.5c-.1-1.4-.4-2.7-1.4-3.7S17.3 2.5 15.9 2.4C14.5 2.3 9.5 2.3 8.1 2.4 6.7 2.5 5.4 2.8 4.4 3.8S3 6.1 2.9 7.5c-.1 1.4-.1 6.4 0 7.8.1 1.4.4 2.7 1.4 3.7s2.3 1.3 3.7 1.4c1.4.1 6.4.1 7.8 0 1.4-.1 2.7-.4 3.7-1.4s1.3-2.3 1.4-3.7c.1-1.4.1-6.4.1-7.8z",
    youtube:
        "M21.6 7.2a2.5 2.5 0 00-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 002.4 7.2 26 26 0 002 12a26 26 0 00.4 4.8 2.5 2.5 0 001.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 001.8-1.8A26 26 0 0022 12a26 26 0 00-.4-4.8zM10 15V9l5.2 3L10 15z",
    tiktok: "M16.6 5.8A4.3 4.3 0 0115.5 3h-3.1v12.4a2.6 2.6 0 11-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.7 5.7 0 104.9 5.7V9.1a7.3 7.3 0 004.3 1.4V7.4a4.3 4.3 0 01-3.2-1.6z",
    x: "M17.8 3h3.1l-6.8 7.7 8 10.3h-6.2l-4.9-6.3L5.4 21H2.3l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z",
    website:
        "M12 2a10 10 0 100 20 10 10 0 000-20zm6.9 6h-2.9a15.6 15.6 0 00-1.4-3.6A8 8 0 0118.9 8zM12 4a14 14 0 011.9 4h-3.8A14 14 0 0112 4zM4.3 14a8.2 8.2 0 010-4h3.4a16.5 16.5 0 000 4H4.3zm.8 2h2.9a15.6 15.6 0 001.4 3.6A8 8 0 015.1 16zM8 8H5.1a8 8 0 014.3-3.6A15.6 15.6 0 008 8zm4 12a14 14 0 01-1.9-4h3.8A14 14 0 0112 20zm2.3-6H9.7a14.7 14.7 0 010-4h4.6a14.7 14.7 0 010 4zm.3 5.6a15.6 15.6 0 001.4-3.6h2.9a8 8 0 01-4.3 3.6zm1.7-5.6a16.5 16.5 0 000-4h3.4a8.2 8.2 0 010 4h-3.4z",
};

function hasContact(content: ShowcaseContent) {
    return Object.values(content.contact).some(Boolean) || Object.values(content.social).some(Boolean);
}

export function ContactSocial({ content, name, t }: { content: ShowcaseContent; name: string; t: T }) {
    if (!hasContact(content)) return null;
    const { phone, email, address, hours } = content.contact;
    const rows: { label: string; value: string; href?: string }[] = [];
    if (phone) rows.push({ label: t.phone, value: phone, href: `tel:${phone.replace(/[^\d+]/g, "")}` });
    if (email) rows.push({ label: t.email, value: email, href: `mailto:${email}` });
    if (address) rows.push({ label: t.address, value: address });
    if (hours) rows.push({ label: t.hours, value: hours });
    const socials = SOCIAL_ORDER.filter((key) => content.social[key]);

    return (
        <section aria-labelledby="contact-heading" className="rounded-2xl border border-border-default bg-bg-surface p-6 sm:p-8">
            <div id="contact-heading">
                <SectionHeading title={t.contact} />
            </div>
            <div className="grid gap-8 md:grid-cols-[1.4fr_1fr]">
                {rows.length > 0 ? (
                    <dl className="grid gap-4 sm:grid-cols-2">
                        {rows.map((row) => (
                            <div key={row.label}>
                                <dt className="text-[12px] font-semibold uppercase tracking-wide text-text-secondary">{row.label}</dt>
                                <dd className="mt-1 whitespace-pre-line text-[15px] text-text-primary">
                                    {row.href ? (
                                        <a href={row.href} className="hover:text-sc-accent-text">
                                            {row.value}
                                        </a>
                                    ) : (
                                        row.value
                                    )}
                                </dd>
                            </div>
                        ))}
                    </dl>
                ) : (
                    <div />
                )}
                {socials.length > 0 ? (
                    <div>
                        <p className="text-[12px] font-semibold uppercase tracking-wide text-text-secondary">
                            {format(t.followUs, { name })}
                        </p>
                        <ul className="mt-3 flex flex-wrap gap-2">
                            {socials.map((key) => (
                                <li key={key}>
                                    <a
                                        href={content.social[key]!}
                                        target="_blank"
                                        rel="noopener noreferrer nofollow"
                                        className="inline-flex items-center gap-2 rounded-full border border-border-default px-3.5 py-1.5 text-[13px] text-text-primary hover:border-sc-accent hover:text-sc-accent-text"
                                    >
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                                            <path d={SOCIAL_ICONS[key]} />
                                        </svg>
                                        {t.social[key]}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}
            </div>
        </section>
    );
}

export function PoliciesSection({ policies, t }: { policies: ShowcaseContent["policies"]; t: T }) {
    const items = [
        { key: "shipping", title: t.shipping, text: policies.shipping },
        { key: "returns", title: t.returns, text: policies.returns },
    ].filter((item) => item.text?.trim());
    if (items.length === 0) return null;

    return (
        <section aria-labelledby="policies-heading">
            <div id="policies-heading">
                <SectionHeading title={t.policies} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                {items.map((item) => (
                    <details
                        key={item.key}
                        open
                        className="group rounded-2xl border border-border-default bg-bg-surface p-5 sm:p-6"
                    >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[16px] font-semibold text-text-primary">
                            {item.title}
                            <span aria-hidden="true" className="text-text-secondary group-open:rotate-180">
                                ▾
                            </span>
                        </summary>
                        <div className="mt-3">
                            <Paragraphs text={item.text!} />
                        </div>
                    </details>
                ))}
            </div>
        </section>
    );
}
