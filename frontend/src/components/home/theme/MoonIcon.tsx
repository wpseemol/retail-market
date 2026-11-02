export function MoonIcon({
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
            <path
                fill="currentColor"
                d="M21 14.08A8.1 8.1 0 0 1 9.92 3 8.4 8.4 0 1 0 21 14.08z"
            />
        </svg>
    );
}
