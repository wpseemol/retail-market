import geoip from "geoip-lite";

const PRIVATE_IP_RE =
  /^(::1|::ffff:127\.|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|fc|fd|fe80)/i;

/** Common ISO → display name (extend as needed). */
const COUNTRY_NAMES: Record<string, string> = {
  LO: "Local network",
  XX: "Unknown",
  BD: "Bangladesh",
  IN: "India",
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
  DE: "Germany",
  FR: "France",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  PK: "Pakistan",
  NP: "Nepal",
  LK: "Sri Lanka",
  MY: "Malaysia",
  SG: "Singapore",
  ID: "Indonesia",
  TH: "Thailand",
  JP: "Japan",
  KR: "South Korea",
  CN: "China",
  BR: "Brazil",
  NG: "Nigeria",
  ZA: "South Africa",
  NL: "Netherlands",
  IT: "Italy",
  ES: "Spain",
  TR: "Turkey",
  RU: "Russia",
};

export function countryName(code: string | null | undefined): string {
  if (!code) return COUNTRY_NAMES.XX;
  const upper = code.toUpperCase();
  return COUNTRY_NAMES[upper] ?? upper;
}

/** Resolve ISO country code from an IP (LO = private/local, XX = unknown). */
export function countryFromIp(ip: string | null | undefined): string {
  if (!ip) return "XX";
  const cleaned = ip.replace(/^::ffff:/i, "").trim();
  if (!cleaned || PRIVATE_IP_RE.test(cleaned) || cleaned === "localhost") {
    return "LO";
  }

  try {
    const lookup = geoip.lookup(cleaned);
    const code = lookup?.country?.toUpperCase();
    if (code && /^[A-Z]{2}$/.test(code)) return code;
  } catch {
    /* ignore */
  }
  return "XX";
}

export function flagEmoji(code: string | null | undefined): string {
  if (!code || code === "XX" || code === "LO" || code.length !== 2) return "🌐";
  const upper = code.toUpperCase();
  const a = 0x1f1e6 - 65;
  return String.fromCodePoint(
    upper.charCodeAt(0) + a,
    upper.charCodeAt(1) + a,
  );
}
