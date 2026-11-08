/** Lightweight decorative marks for account sections (no image assets). */

export function IdCardDecor({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 140"
      fill="none"
      aria-hidden
      className={className}
    >
      <rect
        x="18"
        y="28"
        width="124"
        height="84"
        rx="14"
        fill="#E7FFE4"
        stroke="#00B207"
        strokeWidth="3"
      />
      <circle cx="52" cy="62" r="16" fill="#00B207" opacity="0.85" />
      <rect x="78" y="48" width="48" height="8" rx="4" fill="#00B207" opacity="0.55" />
      <rect x="78" y="64" width="36" height="8" rx="4" fill="#00B207" opacity="0.35" />
      <rect x="36" y="88" width="88" height="8" rx="4" fill="#00B207" opacity="0.25" />
      <circle cx="122" cy="108" r="22" fill="#00B207" />
      <path
        d="M112 108.5l6.5 6.5 13-14"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PhoneShieldDecor({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 160"
      fill="none"
      aria-hidden
      className={className}
    >
      <rect
        x="38"
        y="12"
        width="64"
        height="110"
        rx="12"
        fill="#E7FFE4"
        stroke="#00B207"
        strokeWidth="3"
      />
      <rect x="52" y="22" width="36" height="6" rx="3" fill="#00B207" opacity="0.35" />
      <circle cx="70" cy="104" r="5" fill="#00B207" opacity="0.55" />
      <path
        d="M70 48c14 6 22 14 22 28 0 18-14 30-22 34-8-4-22-16-22-34 0-14 8-22 22-28z"
        fill="#00B207"
      />
      <path
        d="M62 74l7 7 13-14"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx="70" cy="142" rx="36" ry="8" fill="#00B207" opacity="0.12" />
    </svg>
  );
}

export function PadlockDecor({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 150"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M45 62V48c0-16 12-28 25-28s25 12 25 28v14"
        stroke="#00B207"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <rect
        x="28"
        y="58"
        width="84"
        height="68"
        rx="16"
        fill="#00B207"
      />
      <circle cx="70" cy="88" r="10" fill="white" />
      <rect x="66" y="88" width="8" height="18" rx="4" fill="white" />
      <ellipse cx="70" cy="140" rx="40" ry="8" fill="#00B207" opacity="0.12" />
    </svg>
  );
}
