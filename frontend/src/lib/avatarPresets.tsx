import React from "react";

export const AVATAR_PRESET_IDS = [
  "sprout",
  "leaf",
  "sun",
  "moon",
  "wave",
  "mountain",
  "fox",
  "bird",
  "fish",
  "gem",
  "star",
  "bolt",
] as const;

export type AvatarPresetId = (typeof AVATAR_PRESET_IDS)[number];

export function isAvatarPresetId(value: string): value is AvatarPresetId {
  return (AVATAR_PRESET_IDS as readonly string[]).includes(value);
}

// ─── Individual SVG icons ─────────────────────────────────────────────────────

function Sprout({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="24" fill="#D1FAE5" />
      <ellipse cx="18" cy="22" rx="8" ry="6" fill="#00B207" opacity="0.9" />
      <ellipse cx="30" cy="20" rx="8" ry="6" fill="#22C55E" opacity="0.85" />
      <path
        d="M24 36 C24 28 20 24 18 22"
        stroke="#00B207"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M24 36 C24 28 28 22 30 20"
        stroke="#16A34A"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="24"
        y1="36"
        x2="24"
        y2="40"
        stroke="#00B207"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Leaf({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="24" fill="#ECFDF5" />
      <path
        d="M14 34 C14 34 14 16 32 12 C32 12 34 28 14 34Z"
        fill="#00B207"
      />
      <path
        d="M14 34 C14 34 14 16 32 12"
        stroke="#15803D"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="14"
        y1="34"
        x2="25"
        y2="22"
        stroke="#15803D"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Sun({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="24" fill="#FEF9C3" />
      <circle cx="24" cy="24" r="8" fill="#FBBF24" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 24 + 11 * Math.cos(rad);
        const y1 = 24 + 11 * Math.sin(rad);
        const x2 = 24 + 16 * Math.cos(rad);
        const y2 = 24 + 16 * Math.sin(rad);
        return (
          <line
            key={angle}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#F59E0B"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

function Moon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="24" fill="#EEF2FF" />
      <path
        d="M30 14 A12 12 0 1 0 30 34 A8 8 0 1 1 30 14Z"
        fill="#6366F1"
      />
      <circle cx="34" cy="16" r="2" fill="#A5B4FC" />
      <circle cx="37" cy="22" r="1.2" fill="#A5B4FC" />
      <circle cx="32" cy="26" r="1.5" fill="#A5B4FC" />
    </svg>
  );
}

function Wave({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="24" fill="#DBEAFE" />
      <path
        d="M8 24 C12 20 16 28 20 24 C24 20 28 28 32 24 C36 20 40 26 42 24"
        stroke="#3B82F6"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M8 30 C12 26 16 34 20 30 C24 26 28 34 32 30 C36 26 40 32 42 30"
        stroke="#60A5FA"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      <path
        d="M10 18 C14 14 18 22 22 18 C26 14 30 22 34 18 C37 16 39 19 40 18"
        stroke="#93C5FD"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}

function Mountain({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="24" fill="#F0FDF4" />
      <polygon points="24,10 38,36 10,36" fill="#00B207" />
      <polygon points="16,22 28,36 4,36" fill="#16A34A" opacity="0.7" />
      <polygon points="24,10 32,22 16,22" fill="white" opacity="0.5" />
    </svg>
  );
}

function Fox({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="24" fill="#FEF3C7" />
      <polygon points="14,14 18,26 10,22" fill="#F97316" />
      <polygon points="34,14 30,26 38,22" fill="#F97316" />
      <ellipse cx="24" cy="27" rx="11" ry="10" fill="#FB923C" />
      <ellipse cx="24" cy="29" rx="7" ry="6" fill="#FED7AA" />
      <circle cx="20" cy="25" r="2" fill="#1C1917" />
      <circle cx="28" cy="25" r="2" fill="#1C1917" />
      <circle cx="20.7" cy="24.3" r="0.7" fill="white" />
      <circle cx="28.7" cy="24.3" r="0.7" fill="white" />
      <ellipse cx="24" cy="31" rx="2" ry="1.2" fill="#F97316" />
    </svg>
  );
}

function Bird({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="24" fill="#F0F9FF" />
      <ellipse cx="24" cy="26" rx="10" ry="8" fill="#38BDF8" />
      <circle cx="24" cy="18" r="6" fill="#0EA5E9" />
      <polygon points="24,22 28,18 30,22" fill="#FCD34D" />
      <circle cx="22" cy="17" r="1.5" fill="#0C4A6E" />
      <circle cx="22.5" cy="16.5" r="0.5" fill="white" />
      <path
        d="M14 26 Q10 20 12 16"
        stroke="#38BDF8"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M34 26 Q38 20 36 16"
        stroke="#38BDF8"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function Fish({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="24" fill="#ECFEFF" />
      <path
        d="M36 24 C36 24 12 16 10 24 C12 32 36 24 36 24Z"
        fill="#06B6D4"
      />
      <path
        d="M36 24 L42 18 L42 30 Z"
        fill="#0891B2"
      />
      <circle cx="14" cy="23" r="2" fill="#083344" />
      <circle cx="14.6" cy="22.4" r="0.6" fill="white" />
      <path
        d="M18 21 Q22 18 26 21"
        stroke="#0E7490"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M18 25 Q22 28 26 25"
        stroke="#0E7490"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Gem({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="24" fill="#FAF5FF" />
      <polygon points="24,10 36,20 24,38 12,20" fill="#A855F7" />
      <polygon points="24,10 36,20 24,22 12,20" fill="#C084FC" />
      <polygon points="24,22 36,20 24,38" fill="#7E22CE" />
      <polygon points="24,22 12,20 24,38" fill="#9333EA" />
      <line x1="12" y1="20" x2="36" y2="20" stroke="#DDD6FE" strokeWidth="1" />
      <line x1="24" y1="10" x2="24" y2="38" stroke="#DDD6FE" strokeWidth="0.7" opacity="0.5" />
    </svg>
  );
}

function Star({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="24" fill="#FFFBEB" />
      <polygon
        points="24,10 27.1,19.9 37.6,19.9 29.2,25.8 32.4,35.8 24,29.9 15.6,35.8 18.8,25.8 10.4,19.9 20.9,19.9"
        fill="#F59E0B"
      />
      <polygon
        points="24,10 27.1,19.9 37.6,19.9 29.2,25.8 32.4,35.8 24,29.9"
        fill="#FBBF24"
        opacity="0.6"
      />
    </svg>
  );
}

function Bolt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="24" fill="#FFF7ED" />
      <polygon
        points="26,10 14,26 23,26 22,38 34,22 25,22"
        fill="#F97316"
      />
      <polygon
        points="26,10 23,22 25,22"
        fill="#FDBA74"
        opacity="0.8"
      />
    </svg>
  );
}

// ─── Preset map ───────────────────────────────────────────────────────────────

const PRESET_MAP: Record<AvatarPresetId, (props: { className?: string }) => React.ReactElement> = {
  sprout: Sprout,
  leaf: Leaf,
  sun: Sun,
  moon: Moon,
  wave: Wave,
  mountain: Mountain,
  fox: Fox,
  bird: Bird,
  fish: Fish,
  gem: Gem,
  star: Star,
  bolt: Bolt,
};

// ─── Public component ─────────────────────────────────────────────────────────

export function AvatarPresetSvg({
  id,
  className,
}: {
  id: AvatarPresetId;
  className?: string;
}) {
  const Component = PRESET_MAP[id];
  return <Component className={className} />;
}
