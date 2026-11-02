export function SunIcon({
    className,
    size = 16,
}: {
    className?: string;
    size?: number;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
            aria-hidden="true"
        >
            <circle cx="12" cy="12" r="5" />
            <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 1.5v2.5" fill="none" />
                <path d="M12 20v2.5" fill="none" />
                <path d="M1.5 12h2.5" fill="none" />
                <path d="M20 12h2.5" fill="none" />
                <path d="M4.2 4.2l1.8 1.8" fill="none" />
                <path d="M18 18l1.8 1.8" fill="none" />
                <path d="M4.2 19.8l1.8-1.8" fill="none" />
                <path d="M18 6l1.8-1.8" fill="none" />
            </g>
        </svg>
    );
}
