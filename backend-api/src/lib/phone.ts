/**
 * Normalize a phone number to E.164 so the same person always matches.
 *
 * Bangladesh mobile formats accepted: `01712345678`, `1712345678`,
 * `8801712345678`, `+880 1712-345678` → `+8801712345678`.
 * Other countries must already include `+<country code>` (8–15 digits).
 * Returns `null` when the value is not a usable phone number.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
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

export const PHONE_FORMAT_MESSAGE =
  "Enter a valid mobile number (e.g. 01712345678 or +8801712345678)";

export function normalizeEmail(raw: string | null | undefined): string | null {
  const value = raw?.trim().toLowerCase();
  return value ? value : null;
}

/** `+8801712345678` → `+88017••••5678` for safe display in messages/logs. */
export function maskPhone(phone: string): string {
  if (phone.length < 8) return phone;
  return `${phone.slice(0, 6)}••••${phone.slice(-4)}`;
}

export function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"•".repeat(Math.max(1, name.length - visible.length))}@${domain}`;
}
