/**
 * Seals sessionStorage values so DevTools does not show plain JWTs / user JSON.
 * Staff auth still uses sessionStorage (tab-scoped) + a short-lived `rm_access`
 * cookie for the API proxy — not httpOnly (Vite SPA). Sealing is defense-in-depth.
 */

const PREFIX = "niy1.";

function hostSalt(): string {
  if (typeof window === "undefined") return "ssr";
  return window.location.host || "local";
}

function keystream(length: number): Uint8Array {
  const pass = `${import.meta.env.VITE_STORAGE_SEAL ?? "niyenin-seal"}|${hostSalt()}|v1`;
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

function getSession(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Read a sealed string; migrates legacy plaintext. */
export function readSealedText(key: string): string | null {
  const store = getSession();
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    if (raw.startsWith(PREFIX)) return unsealText(raw);
    writeSealedText(key, raw);
    return raw;
  } catch {
    return null;
  }
}

export function writeSealedText(key: string, value: string): void {
  const store = getSession();
  if (!store) return;
  try {
    store.setItem(key, sealText(value));
  } catch {
    /* ignore */
  }
}

export function readSealedJson<T>(key: string): T | null {
  const store = getSession();
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    if (raw.startsWith(PREFIX)) {
      const plain = unsealText(raw);
      if (!plain) return null;
      return JSON.parse(plain) as T;
    }
    const parsed = JSON.parse(raw) as T;
    writeSealedJson(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function writeSealedJson(key: string, value: unknown): void {
  const store = getSession();
  if (!store) return;
  try {
    store.setItem(key, sealText(JSON.stringify(value)));
  } catch {
    /* ignore */
  }
}

export function removeSealed(key: string): void {
  const store = getSession();
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    /* ignore */
  }
}
