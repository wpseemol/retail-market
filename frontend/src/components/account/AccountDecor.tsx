/** Soft SVG decorations based on the account design art (no PNG assets). */

type DecorProps = {
  className?: string;
};

export function IdCardDecor({ className }: DecorProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden
      className={className}
    >
      <defs>
        <linearGradient id="id-card-bg" x1="40" y1="20" x2="160" y2="180" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5FD46A" />
          <stop offset="1" stopColor="#00B207" />
        </linearGradient>
        <linearGradient id="id-check" x1="130" y1="120" x2="175" y2="175" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4CD964" />
          <stop offset="1" stopColor="#00A006" />
        </linearGradient>
        <filter id="id-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#00B207" floodOpacity="0.22" />
        </filter>
      </defs>
      <ellipse cx="108" cy="168" rx="58" ry="12" fill="#00B207" opacity="0.12" />
      <g filter="url(#id-soft)">
        <rect x="38" y="34" width="118" height="118" rx="22" fill="url(#id-card-bg)" />
        <rect x="52" y="50" width="90" height="78" rx="12" fill="white" />
        <circle cx="74" cy="78" r="14" fill="#00B207" opacity="0.85" />
        <path
          d="M66 76c0-4.4 3.6-8 8-8s8 3.6 8 8c0 2.2-.9 4.2-2.3 5.6C77 85.2 74 87 74 87s-3-1.8-5.7-5.4C66.9 80.2 66 78.2 66 76z"
          fill="white"
          opacity="0.9"
        />
        <rect x="96" y="66" width="34" height="7" rx="3.5" fill="#D1EAD4" />
        <rect x="96" y="80" width="28" height="7" rx="3.5" fill="#E3F3E6" />
        <rect x="96" y="94" width="22" height="7" rx="3.5" fill="#E3F3E6" />
        <rect x="64" y="108" width="54" height="7" rx="3.5" fill="#E8F6EA" />
        <circle cx="148" cy="148" r="26" fill="url(#id-check)" />
        <path
          d="M136 148.5l8 8 16-17"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <circle cx="158" cy="48" r="3" fill="#F5D76E" opacity="0.9" />
      <circle cx="46" cy="56" r="2.5" fill="#F5D76E" opacity="0.75" />
    </svg>
  );
}

export function PhoneShieldDecor({ className }: DecorProps) {
  return (
    <svg
      viewBox="0 0 180 200"
      fill="none"
      aria-hidden
      className={className}
    >
      <defs>
        <linearGradient id="phone-body" x1="50" y1="20" x2="130" y2="180" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2A2D3E" />
          <stop offset="1" stopColor="#151722" />
        </linearGradient>
        <linearGradient id="shield-fill" x1="70" y1="70" x2="120" y2="140" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5FD46A" />
          <stop offset="1" stopColor="#00B207" />
        </linearGradient>
        <filter id="phone-soft" x="-25%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#00B207" floodOpacity="0.2" />
        </filter>
      </defs>
      <ellipse cx="98" cy="178" rx="48" ry="11" fill="#00B207" opacity="0.12" />
      <g filter="url(#phone-soft)">
        <g transform="rotate(-18 90 100)">
          <rect x="58" y="28" width="72" height="124" rx="14" fill="url(#phone-body)" />
          <rect x="64" y="36" width="60" height="100" rx="8" fill="white" />
          <rect x="82" y="40" width="24" height="4" rx="2" fill="#D8DCE6" />
          <circle cx="94" cy="128" r="4" fill="#2A2D3E" opacity="0.35" />
          <path
            d="M94 62c16 7 26 16 26 32 0 20-16 34-26 38-10-4-26-18-26-38 0-16 10-25 26-32z"
            fill="url(#shield-fill)"
          />
          <path
            d="M84 92l8 8 14-15"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
      <path d="M128 42c6-2 10-1 14 2" stroke="#5FD46A" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      <path d="M132 52c5-1 9 0 12 3" stroke="#5FD46A" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      <path d="M134 62c4 0 7 1 10 3" stroke="#5FD46A" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

export function PadlockDecor({ className }: DecorProps) {
  return (
    <svg
      viewBox="0 0 180 180"
      fill="none"
      aria-hidden
      className={className}
    >
      <defs>
        <linearGradient id="lock-body" x1="40" y1="70" x2="140" y2="160" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5FD46A" />
          <stop offset="1" stopColor="#00A006" />
        </linearGradient>
        <linearGradient id="lock-shackle" x1="60" y1="20" x2="120" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7EE087" />
          <stop offset="1" stopColor="#00B207" />
        </linearGradient>
        <filter id="lock-soft" x="-25%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#00B207" floodOpacity="0.22" />
        </filter>
      </defs>
      <ellipse cx="90" cy="158" rx="46" ry="10" fill="#00B207" opacity="0.12" />
      <g filter="url(#lock-soft)">
        <path
          d="M58 78V58c0-18 14-32 32-32s32 14 32 32v20"
          stroke="url(#lock-shackle)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <rect x="40" y="74" width="100" height="78" rx="20" fill="url(#lock-body)" />
        <circle cx="90" cy="108" r="12" fill="#E8FCEC" />
        <rect x="85" y="108" width="10" height="22" rx="5" fill="#E8FCEC" />
      </g>
      <circle cx="52" cy="48" r="3" fill="#F5D76E" opacity="0.9" />
      <circle cx="128" cy="40" r="2.5" fill="#F5D76E" opacity="0.75" />
    </svg>
  );
}
