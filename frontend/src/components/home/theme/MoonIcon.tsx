export function MoonIcon({
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
            <path d="M20.5 15.2A8.2 8.2 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2z" />
        </svg>
    );
}
