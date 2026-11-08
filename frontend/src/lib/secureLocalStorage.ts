/**
 * Client storage sealing — keeps DevTools from showing plain JSON.
 *
 * Login tokens/user already live in the httpOnly `rm_session` cookie (not here).
 * This seals cart / wishlist / chrome / contact / search caches that must stay
 * on the device for offline UX.
 *
 * Note: any key usable from JS can also be used by XSS. Sealing stops casual
 * inspection; httpOnly cookies remain the real auth boundary.
 */

const PREFIX = "niy1.";

function hostSalt(): string {
  if (typeof window === "undefined") return "ssr";
  return window.location.host || "local";
}

/** Expand a passphrase into a repeating keystream (sync, no WebCrypto). */
function keystream(length: number): Uint8Array {
  const pass = `${process.env.NEXT_PUBLIC_STORAGE_SEAL ?? "niyenin-seal"}|${hostSalt()}|v1`;
  const out = new Uint8Array(length);
  let a = 2166136261;
  for (let i = 0; i < pass.length; i++) {
    a ^= pass.charCodeAt(i);
    a = Math.imul(a, 16777619);
  }
  for (let i = 0; i < length; i++) {
    a ^= a << 13;
    a ^= a >>> 17;
    a ^= a << 5;
    out[i] = a & 0xff;
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function sealText(plain: string): string {
  const data = new TextEncoder().encode(plain);
  const key = keystream(data.length);
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i]! ^ key[i]!;
  return PREFIX + bytesToBase64(out);
}

function unsealText(raw: string): string | null {
  if (!raw.startsWith(PREFIX)) return null;
  try {
    const data = base64ToBytes(raw.slice(PREFIX.length));
    const key = keystream(data.length);
    const out = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) out[i] = data[i]! ^ key[i]!;
    return new TextDecoder().decode(out);
  } catch {
    return null;
  }
}

function getStore(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Read JSON — migrates legacy plaintext values to sealed form. */
export function readSealedJson<T>(key: string): T | null {
  const store = getStore();
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    if (!raw) return null;

    if (raw.startsWith(PREFIX)) {
      const plain = unsealText(raw);
      if (!plain) return null;
      return JSON.parse(plain) as T;
    }

    // Legacy plaintext → re-seal so DevTools no longer shows JSON.
    const parsed = JSON.parse(raw) as T;
    writeSealedJson(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function writeSealedJson(key: string, value: unknown): void {
  const store = getStore();
  if (!store) return;
  try {
    store.setItem(key, sealText(JSON.stringify(value)));
  } catch {
    // Quota / private mode — ignore.
  }
}

export function removeSealed(key: string): void {
  const store = getStore();
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Drop known legacy plaintext auth leftovers from older builds. */
export function scrubLegacyAuthLocalStorage(): void {
  const store = getStore();
  if (!store) return;
  const keys = [
    "rm_customer_token",
    "rm_customer_refresh_token",
    "rm_customer_user",
    "rm_access_token",
    "rm_refresh_token",
    "rm_staff_token",
    "rm_staff_user",
    "mc-auth", // other apps sometimes share the same origin in local testing
  ];
  for (const key of keys) {
    try {
      store.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}
