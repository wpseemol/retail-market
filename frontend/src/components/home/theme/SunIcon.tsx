export function SunIcon({
    className,
    size = 18,
}: {
    className?: string;
    size?: number;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className={className}
            aria-hidden="true"
            focusable="false"
        >
            <circle cx="12" cy="12" r="5" fill="currentColor" />
            <g
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                fill="none"
            >
                <path d="M12 2v2.2" />
                <path d="M12 19.8V22" />
                <path d="M2 12h2.2" />
                <path d="M19.8 12H22" />
                <path d="M4.6 4.6l1.6 1.6" />
                <path d="M17.8 17.8l1.6 1.6" />
                <path d="M4.6 19.4l1.6-1.6" />
                <path d="M17.8 6.2l1.6-1.6" />
            </g>
        </svg>
    );
}
