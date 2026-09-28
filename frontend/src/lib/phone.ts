export const PHONE_FORMAT_MESSAGE =
  "Enter a valid mobile number (e.g. 01712345678 or +8801712345678)";

/** Mirrors backend `normalizePhone` → E.164 (`+8801712345678`), or null if invalid. */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (/^01[3-9]\d{8}$/.test(digits)) return `+880${digits.slice(1)}`;
  if (/^1[3-9]\d{8}$/.test(digits)) return `+880${digits}`;
  if (/^8801[3-9]\d{8}$/.test(digits)) return `+${digits}`;
  if ((hasPlus || trimmed.startsWith("00")) && /^[1-9]\d{7,14}$/.test(digits)) {
    return digits.startsWith("880") ? null : `+${digits}`;
  }
  return null;
}
