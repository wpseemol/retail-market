/** Banner SVG icons — soft outline style for the account profile header. */

type IconProps = { className?: string };

export function BannerCrownIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M4 16.5 6.2 8.8c.15-.5.8-.65 1.15-.25L10 12l1.4-4.2c.2-.55.95-.55 1.15 0L14 12l2.65-3.45c.35-.4 1-.25 1.15.25L20 16.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 16.5h14v1.8A1.7 1.7 0 0 1 17.3 20H6.7A1.7 1.7 0 0 1 5 18.3v-1.8Z"
        fill="currentColor"
        opacity="0.9"
      />
      <circle cx="4.2" cy="7.2" r="1.35" fill="currentColor" />
      <circle cx="12" cy="5.2" r="1.35" fill="currentColor" />
      <circle cx="19.8" cy="7.2" r="1.35" fill="currentColor" />
    </svg>
  );
}

export function BannerMailIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <rect
        x="3.25"
        y="5.5"
        width="17.5"
        height="13"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="m4.5 7.5 6.4 5.1a1.8 1.8 0 0 0 2.2 0L19.5 7.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BannerCameraIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M9 7.25h1.1l.7-1.1A1.4 1.4 0 0 1 12 5.5h0a1.4 1.4 0 0 1 1.2.65l.7 1.1H15A3.25 3.25 0 0 1 18.25 10.5v5A3.25 3.25 0 0 1 15 18.75H9A3.25 3.25 0 0 1 5.75 15.5v-5A3.25 3.25 0 0 1 9 7.25Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="2.75" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

export function BannerArrowIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M5 12h12.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="m12.5 6.5 5.5 5.5-5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BannerGoogleMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-1.9 3l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-1.9H12z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3l-.9.7-2.6 2C4.7 20.1 8.1 22 12 22c2.7 0 5-.9 6.7-2.4l-3.1-2.4c-.9.6-2 1-3.6 1-2.8 0-5.1-1.9-6-4.4z"
      />
      <path
        fill="#4A90E2"
        d="M3.1 7c-.6 1.2-1 2.5-1 4s.4 2.8 1 4c0 .1 3.5-2.7 3.5-2.7-.2-.6-.3-1.2-.3-1.3s.1-.7.3-1.3L3.1 7z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.3c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.3 14.7 1.3 12 1.3 8.1 1.3 4.7 3.2 3.1 7l3.5 2.7C7 7.2 9.2 5.3 12 5.3z"
      />
    </svg>
  );
}

/** Large watermark silhouette for layer 3 of the banner. */
export function BannerUserWatermark({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      className={className}
      aria-hidden
    >
      <circle cx="80" cy="80" r="78" fill="currentColor" opacity="0.12" />
      <circle cx="80" cy="58" r="28" fill="currentColor" opacity="0.55" />
      <path
        d="M28 138c6-30 28-46 52-46s46 16 52 46"
        fill="currentColor"
        opacity="0.55"
      />
    </svg>
  );
}
