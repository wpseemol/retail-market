"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type MouseEvent,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const HOVER_ZOOM = 2.5;
const LIGHTBOX_ZOOM = 2.5;

function useCanHover() {
    const [canHover, setCanHover] = useState(false);
    useEffect(() => {
        const query = window.matchMedia("(hover: hover) and (pointer: fine)");
        const update = () => setCanHover(query.matches);
        update();
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);
    return canHover;
}

function cssUrl(src: string) {
    return `url("${src.replace(/"/g, '\\"')}")`;
}

function percentFromEvent(e: MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
        x: Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)),
        y: Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100)),
    };
}

function Icon({ d, size = 18 }: { d: string; size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d={d} />
        </svg>
    );
}

const ICONS = {
    zoomIn: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.35-4.35M11 8v6M8 11h6",
    zoomOut: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.35-4.35M8 11h6",
    expand: "M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7",
    close: "M18 6 6 18M6 6l12 12",
    prev: "M15 18l-6-6 6-6",
    next: "M9 18l6-6-6-6",
};

/**
 * Main product image with a hover magnifier (mouse) and a click/tap
 * full-screen preview with next/prev, thumbnails and click-to-zoom.
 */
export function ProductImageZoom({
    images,
    activeIndex,
    alt,
    onIndexChange,
    children,
}: {
    images: string[];
    activeIndex: number;
    alt: string;
    onIndexChange: (index: number) => void;
    /** The normally rendered main image. */
    children: ReactNode;
}) {
    const canHover = useCanHover();
    const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
    const [open, setOpen] = useState(false);
    const src = images[activeIndex] ?? images[0];
    const openPreview = () => {
        setHover(null);
        setOpen(true);
    };

    return (
        <>
            <div
                role="button"
                tabIndex={0}
                aria-label={`Open full-screen preview of ${alt}`}
                onClick={openPreview}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openPreview();
                    }
                }}
                onMouseMove={canHover ? (e) => setHover(percentFromEvent(e)) : undefined}
                onMouseLeave={() => setHover(null)}
                className={`group relative flex-1 min-h-[280px] sm:min-h-[360px] lg:min-h-[420px] rounded-lg border border-border-default bg-bg-subtle overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                    canHover ? "cursor-zoom-in" : "cursor-pointer"
                }`}
            >
                {children}

                {hover && src ? (
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-bg-subtle bg-no-repeat"
                        style={{
                            backgroundImage: cssUrl(src),
                            backgroundSize: `${HOVER_ZOOM * 100}%`,
                            backgroundPosition: `${hover.x}% ${hover.y}%`,
                        }}
                    />
                ) : null}

                <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-bg-base/90 px-2.5 py-1.5 text-[12px] font-medium text-text-secondary shadow-sm border border-border-default opacity-90 group-hover:opacity-100">
                    <Icon d={canHover ? ICONS.zoomIn : ICONS.expand} size={14} />
                    {canHover ? "Hover to zoom · click to expand" : "Tap to expand"}
                </span>
            </div>

            {open ? (
                <ProductLightbox
                    images={images}
                    index={activeIndex}
                    alt={alt}
                    onIndexChange={onIndexChange}
                    onClose={() => setOpen(false)}
                />
            ) : null}
        </>
    );
}

function ProductLightbox({
    images,
    index,
    alt,
    onIndexChange,
    onClose,
}: {
    images: string[];
    index: number;
    alt: string;
    onIndexChange: (index: number) => void;
    onClose: () => void;
}) {
    const [zoomed, setZoomed] = useState(false);
    const [origin, setOrigin] = useState({ x: 50, y: 50 });
    const closeRef = useRef<HTMLButtonElement>(null);
    const count = images.length;

    const go = useCallback(
        (delta: number) => {
            setZoomed(false);
            onIndexChange((index + delta + count) % count);
        },
        [index, count, onIndexChange],
    );

    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        closeRef.current?.focus();
        return () => {
            document.body.style.overflow = overflow;
            previous?.focus();
        };
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            else if (e.key === "ArrowLeft" && count > 1) go(-1);
            else if (e.key === "ArrowRight" && count > 1) go(1);
            else if (e.key === "+" || e.key === "=") setZoomed(true);
            else if (e.key === "-") setZoomed(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [go, onClose, count]);

    const src = images[index] ?? images[0];

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`${alt} — image ${index + 1} of ${count}`}
            className="fixed inset-0 z-[100] flex flex-col bg-neutral-950/95 text-white"
        >
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
                <span className="text-[13px] tabular-nums text-white/80">
                    {index + 1} / {count}
                </span>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setZoomed((z) => !z)}
                        aria-label={zoomed ? "Zoom out" : "Zoom in"}
                        aria-pressed={zoomed}
                        className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-colors"
                    >
                        <Icon d={zoomed ? ICONS.zoomOut : ICONS.zoomIn} />
                    </button>
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Close preview"
                        className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-colors"
                    >
                        <Icon d={ICONS.close} />
                    </button>
                </div>
            </div>

            <div
                className="relative flex-1 min-h-0 overflow-hidden"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <div
                    className={`absolute inset-0 flex items-center justify-center p-4 sm:p-10 ${
                        zoomed ? "cursor-zoom-out" : "cursor-zoom-in"
                    }`}
                    onClick={(e) => {
                        if (e.target !== e.currentTarget) {
                            setOrigin(percentFromEvent(e));
                            setZoomed((z) => !z);
                        } else {
                            onClose();
                        }
                    }}
                    onMouseMove={zoomed ? (e) => setOrigin(percentFromEvent(e)) : undefined}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        key={src}
                        src={src}
                        alt={`${alt} — image ${index + 1}`}
                        draggable={false}
                        className="h-full w-full max-w-5xl select-none object-contain transition-transform duration-200 ease-out"
                        style={{
                            transform: zoomed ? `scale(${LIGHTBOX_ZOOM})` : "scale(1)",
                            transformOrigin: `${origin.x}% ${origin.y}%`,
                        }}
                    />
                </div>

                {count > 1 ? (
                    <>
                        <button
                            type="button"
                            onClick={() => go(-1)}
                            aria-label="Previous image"
                            className="absolute left-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center cursor-pointer transition-colors"
                        >
                            <Icon d={ICONS.prev} size={22} />
                        </button>
                        <button
                            type="button"
                            onClick={() => go(1)}
                            aria-label="Next image"
                            className="absolute right-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center cursor-pointer transition-colors"
                        >
                            <Icon d={ICONS.next} size={22} />
                        </button>
                    </>
                ) : null}
            </div>

            {count > 1 ? (
                <div className="flex justify-center gap-2 overflow-x-auto px-4 py-3">
                    {images.map((thumb, i) => (
                        <button
                            key={`${thumb}-${i}`}
                            type="button"
                            onClick={() => {
                                setZoomed(false);
                                onIndexChange(i);
                            }}
                            aria-label={`Show image ${i + 1}`}
                            aria-current={i === index ? "true" : undefined}
                            className={`h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 bg-white cursor-pointer transition-opacity ${
                                i === index
                                    ? "border-brand-primary opacity-100"
                                    : "border-transparent opacity-60 hover:opacity-100"
                            }`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={thumb} alt="" className="size-full object-contain p-1" />
                        </button>
                    ))}
                </div>
            ) : null}

            <p className="pb-3 text-center text-[12px] text-white/60">
                Click the image to zoom · ← → to browse · Esc to close
            </p>
        </div>,
        document.body,
    );
}
