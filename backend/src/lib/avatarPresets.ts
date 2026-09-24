/** Allowlisted built-in SVG avatar keys (no free-form SVG upload). */
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
