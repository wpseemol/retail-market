import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function UserIcon(props: IconProps) {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            {...props}
        >
            <path
                d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M4.5 20.25a7.5 7.5 0 0 1 15 0"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function EnvelopeIcon(props: IconProps) {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            {...props}
        >
            <path
                d="M3.75 6.75h16.5v10.5a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V6.75Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            <path
                d="m3.75 6.75 8.25 6.75 8.25-6.75"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function LockIcon(props: IconProps) {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            {...props}
        >
            <rect
                x="4.5"
                y="10.5"
                width="15"
                height="10.5"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
            />
            <path
                d="M8.25 10.5V7.5a3.75 3.75 0 0 1 7.5 0v3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
        </svg>
    );
}

export function EyeIcon(props: IconProps) {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            {...props}
        >
            <path
                d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            <circle
                cx="12"
                cy="12"
                r="2.75"
                stroke="currentColor"
                strokeWidth="1.5"
            />
        </svg>
    );
}

export function EyeOffIcon(props: IconProps) {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            {...props}
        >
            <path
                d="M3 3l18 18"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            <path
                d="M10.48 10.52a2.75 2.75 0 0 0 3.99 3.78"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            <path
                d="M6.71 6.76C4.3 8.28 2.7 10.7 2.25 12c0 0 3.75 6.75 9.75 6.75 1.68 0 3.2-.4 4.5-1.02"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M14.12 5.45A10.4 10.4 0 0 1 12 5.25C6 5.25 2.25 12 2.25 12c.28.8.75 1.8 1.4 2.78"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M12.8 7.3A9.6 9.6 0 0 1 21.75 12s-1.05 1.9-2.95 3.7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function AppleIcon(props: IconProps) {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            {...props}
        >
            <path d="M16.7 12.6c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.3-.1-2.6.8-3.3.8-.7 0-1.8-.8-3-.7-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 0.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.2 0 2-1.1 2.8-2.2.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.4-.9-2.4-3.8ZM14.8 5.8c.6-.8 1.1-1.9.9-3-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.8-.9 2.9 1 0 2-.5 2.6-1.3Z" />
        </svg>
    );
}

export function GoogleIcon(props: IconProps) {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            aria-hidden="true"
            {...props}
        >
            <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
            />
            <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
            />
            <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z"
            />
            <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
            />
        </svg>
    );
}

export function FacebookIcon(props: IconProps) {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="#1877F2"
            aria-hidden="true"
            {...props}
        >
            <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.54-4.7 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.5 0-1.96.93-1.96 1.89v2.27h3.34l-.53 3.49h-2.81V24C19.61 23.09 24 18.1 24 12.07Z" />
        </svg>
    );
}
