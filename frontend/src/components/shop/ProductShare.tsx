"use client";

import { useEffect, useRef, useState } from "react";

type ShareTarget = {
    id: string;
    label: string;
    color: string;
    icon: string;
    href: (url: string, title: string, image: string) => string;
};

/** Brand marks (24×24) from Simple Icons. */
const SHARE_TARGETS: ShareTarget[] = [
    {
        id: "whatsapp",
        label: "WhatsApp",
        color: "#25D366",
        icon: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z",
        href: (url, title) =>
            `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    },
    {
        id: "gmail",
        label: "Gmail",
        color: "#EA4335",
        icon: "M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z",
        href: (url, title) =>
            `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(title)}&body=${encodeURIComponent(`${title}\n\n${url}`)}`,
    },
    {
        id: "facebook",
        label: "Facebook",
        color: "#1877F2",
        icon: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
        href: (url) =>
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
        id: "messenger",
        label: "Messenger",
        color: "#0084FF",
        icon: "M.001 11.639C.001 4.949 5.241 0 12.001 0S24 4.95 24 11.639c0 6.689-5.24 11.638-12 11.638-1.21 0-2.38-.16-3.47-.46a.96.96 0 0 0-.64.05l-2.39 1.05a.96.96 0 0 1-1.35-.85l-.07-2.14a.97.97 0 0 0-.32-.68A11.39 11.39 0 0 1 .002 11.64zm8.32-2.19-3.52 5.6c-.35.53.32 1.139.82.75l3.79-2.87c.26-.2.6-.2.87 0l2.8 2.1c.84.63 2.04.4 2.6-.48l3.52-5.6c.35-.53-.32-1.13-.82-.75l-3.79 2.87c-.25.2-.6.2-.86 0l-2.8-2.1a1.8 1.8 0 0 0-2.61.48z",
        href: (url) => `fb-messenger://share/?link=${encodeURIComponent(url)}`,
    },
    {
        id: "x",
        label: "X",
        color: "#000000",
        icon: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z",
        href: (url, title) =>
            `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
    {
        id: "pinterest",
        label: "Pinterest",
        color: "#E60023",
        icon: "M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z",
        href: (url, title, image) =>
            `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&media=${encodeURIComponent(image)}&description=${encodeURIComponent(title)}`,
    },
];

function absoluteImage(src: string) {
    if (/^https?:\/\//i.test(src)) return src;
    return `${window.location.origin}${src.startsWith("/") ? "" : "/"}${src}`;
}

/** Current page URL without query/hash, so tracking params are never shared. */
function currentPageUrl(fallback: string) {
    if (typeof window === "undefined") return fallback;
    return `${window.location.origin}${window.location.pathname}`;
}

async function copyText(text: string) {
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return;
        } catch {
            /* permission denied — fall through to the legacy path */
        }
    }
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    field.remove();
    if (!ok) throw new Error("copy failed");
}

function isMobile() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export default function ProductShare({
    url,
    title,
    image,
}: {
    /** Canonical product URL (used for server-rendered links). */
    url: string;
    title: string;
    image: string;
}) {
    const [status, setStatus] = useState<"idle" | "copied" | "error" | "messenger">("idle");
    const [manualUrl, setManualUrl] = useState<string | null>(null);
    const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => () => clearTimeout(resetTimer.current), []);

    const flash = (next: typeof status) => {
        setStatus(next);
        clearTimeout(resetTimer.current);
        if (next === "error") return;
        resetTimer.current = setTimeout(() => setStatus("idle"), 2500);
    };

    const handleCopy = async () => {
        const pageUrl = currentPageUrl(url);
        try {
            await copyText(pageUrl);
            setManualUrl(null);
            flash("copied");
        } catch {
            setManualUrl(pageUrl);
            flash("error");
        }
    };

    const handleShare = async (target: ShareTarget) => {
        const pageUrl = currentPageUrl(url);
        // Messenger's web share dialog needs a Facebook app id; on desktop copy the link instead.
        if (target.id === "messenger" && !isMobile()) {
            try {
                await copyText(pageUrl);
            } catch {
                /* still open Messenger */
            }
            flash("messenger");
            window.open("https://www.messenger.com/", "_blank", "noopener,noreferrer");
            return;
        }
        const href = target.href(pageUrl, title, absoluteImage(image));
        if (href.startsWith("fb-messenger:")) {
            window.location.assign(href);
            return;
        }
        window.open(href, "_blank", "noopener,noreferrer,width=640,height=560");
    };

    const statusText =
        status === "copied"
            ? "Link copied!"
            : status === "messenger"
              ? "Link copied — paste it in Messenger"
              : status === "error"
                ? "Copy blocked by the browser — press Ctrl+C (⌘C) to copy the link below"
                : "";

    return (
        <div className="flex flex-wrap items-center gap-3 pt-2">
            <span id="product-share-label" className="text-[13px] font-medium text-text-primary">
                Share:
            </span>
            <ul
                aria-labelledby="product-share-label"
                className="flex flex-wrap items-center gap-2 list-none m-0 p-0"
            >
                {SHARE_TARGETS.map((target) => (
                    <li key={target.id}>
                        <a
                            href={target.href(url, title, image)}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            onClick={(e) => {
                                e.preventDefault();
                                void handleShare(target);
                            }}
                            aria-label={`Share on ${target.label}`}
                            title={`Share on ${target.label}`}
                            className="h-8 w-8 rounded-full flex items-center justify-center text-white hover:opacity-85 hover:-translate-y-0.5 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
                            style={{ backgroundColor: target.color }}
                        >
                            <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                aria-hidden="true"
                            >
                                <path d={target.icon} />
                            </svg>
                        </a>
                    </li>
                ))}
                <li>
                    <button
                        type="button"
                        onClick={handleCopy}
                        aria-label="Copy product link"
                        title="Copy product link"
                        className={`h-8 px-3 rounded-full border flex items-center gap-1.5 text-[12px] font-medium cursor-pointer transition-colors ${
                            status === "copied"
                                ? "border-brand-primary bg-brand-primary text-white"
                                : "border-border-default bg-bg-subtle text-text-secondary hover:text-brand-primary hover:border-brand-primary"
                        }`}
                    >
                        {status === "copied" ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M20 6 9 17l-5-5" />
                            </svg>
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                        )}
                        {status === "copied" ? "Copied" : "Copy link"}
                    </button>
                </li>
            </ul>
            <p
                role="status"
                aria-live="polite"
                className={`basis-full text-[12px] m-0 ${statusText ? "" : "sr-only"} ${
                    status === "error" ? "text-error" : "text-brand-primary"
                }`}
            >
                {statusText}
            </p>
            {manualUrl ? (
                <div className="basis-full flex max-w-xl items-center gap-2">
                    <label htmlFor="product-share-url" className="sr-only">
                        Product link
                    </label>
                    <input
                        id="product-share-url"
                        readOnly
                        autoFocus
                        value={manualUrl}
                        onFocus={(e) => e.currentTarget.select()}
                        className="h-9 flex-1 min-w-0 rounded-md border border-border-default bg-bg-subtle px-3 text-[13px] text-text-primary"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            setManualUrl(null);
                            setStatus("idle");
                        }}
                        className="h-9 px-3 rounded-md border border-border-default text-[12px] text-text-secondary hover:text-brand-primary hover:border-brand-primary cursor-pointer"
                    >
                        Done
                    </button>
                </div>
            ) : null}
        </div>
    );
}
