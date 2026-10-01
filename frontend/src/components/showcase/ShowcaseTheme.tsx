import type { CSSProperties, ReactNode } from "react";

const HEX = /^#[0-9a-f]{6}$/i;

/** Black or white, whichever reads better on the given background (WCAG luminance). */
export function readableTextOn(hex: string): "#111111" | "#FFFFFF" {
    const channel = (offset: number) => {
        const c = parseInt(hex.slice(offset, offset + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
    return luminance > 0.36 ? "#111111" : "#FFFFFF";
}

/** Scopes the vendor/brand accent colour to the page via CSS variables. */
export function ShowcaseTheme({ accent, children }: { accent: string | null | undefined; children: ReactNode }) {
    const style =
        accent && HEX.test(accent)
            ? ({ "--showcase-accent": accent, "--showcase-on-accent": readableTextOn(accent) } as CSSProperties)
            : undefined;

    return (
        <div className="showcase-theme flex-1 bg-bg-base" style={style}>
            {children}
        </div>
    );
}
