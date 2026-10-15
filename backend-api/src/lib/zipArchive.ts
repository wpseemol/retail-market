import { inflateRawSync } from "node:zlib";

/**
 * Minimal ZIP reader for imports. Entries are inflated one at a time with a hard
 * output cap, so a zip bomb fails fast instead of filling memory or CPU.
 * ZIP64, encrypted entries and compression other than stored / deflate are rejected.
 */

export type ZipEntry = {
  /** Normalised forward-slash path, no leading slash. */
  name: string;
  method: number;
  compressedSize: number;
  size: number;
  localOffset: number;
};

const EOCD_SIG = 0x06054b50;
const CENTRAL_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;

export function isZipBuffer(buffer: Buffer) {
  return buffer.length >= 4 && buffer.readUInt32LE(0) === LOCAL_SIG;
}

/** `null` for names that try to escape the archive root. */
export function normalizeZipPath(raw: string) {
  const name = raw.replace(/\\/g, "/").replace(/^\.\/+/, "");
  if (!name || name.startsWith("/") || /^[a-z]:/i.test(name)) return null;
  const parts = name.split("/");
  if (parts.some((p) => p === ".." || p === ".")) return null;
  return parts.filter(Boolean).join("/");
}

export function listZipEntries(
  buffer: Buffer,
  maxEntries: number,
): ZipEntry[] | { error: string } {
  const searchFrom = Math.max(0, buffer.length - 0xffff - 22);
  let eocd = -1;
  for (let i = buffer.length - 22; i >= searchFrom; i--) {
    if (buffer.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return { error: "ZIP file is damaged (no central directory)" };

  const total = buffer.readUInt16LE(eocd + 10);
  const cdOffset = buffer.readUInt32LE(eocd + 16);
  if (total === 0xffff || cdOffset === 0xffffffff) {
    return { error: "ZIP64 archives are not supported" };
  }
  if (total > maxEntries) {
    return { error: `ZIP can contain at most ${maxEntries} files` };
  }

  const entries: ZipEntry[] = [];
  let p = cdOffset;
  for (let n = 0; n < total; n++) {
    if (p + 46 > buffer.length || buffer.readUInt32LE(p) !== CENTRAL_SIG) {
      return { error: "ZIP file is damaged (bad directory entry)" };
    }
    const flags = buffer.readUInt16LE(p + 8);
    const method = buffer.readUInt16LE(p + 10);
    const compressedSize = buffer.readUInt32LE(p + 20);
    const size = buffer.readUInt32LE(p + 24);
    const nameLen = buffer.readUInt16LE(p + 28);
    const extraLen = buffer.readUInt16LE(p + 30);
    const commentLen = buffer.readUInt16LE(p + 32);
    const localOffset = buffer.readUInt32LE(p + 42);
    const rawName = buffer.toString("utf8", p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;

    if (rawName.endsWith("/")) continue;
    if (flags & 0x1) return { error: "Encrypted ZIP files are not supported" };
    if (compressedSize === 0xffffffff || size === 0xffffffff || localOffset === 0xffffffff) {
      return { error: "ZIP64 archives are not supported" };
    }
    const name = normalizeZipPath(rawName);
    if (!name) return { error: `Unsafe path in ZIP: ${rawName.slice(0, 80)}` };
    entries.push({ name, method, compressedSize, size, localOffset });
  }
  return entries;
}

export function readZipEntry(
  buffer: Buffer,
  entry: ZipEntry,
  maxBytes: number,
): Buffer | { error: string } {
  if (entry.size > maxBytes) return { error: "File is too large" };
  const h = entry.localOffset;
  if (h + 30 > buffer.length || buffer.readUInt32LE(h) !== LOCAL_SIG) {
    return { error: "ZIP file is damaged (bad local header)" };
  }
  const start = h + 30 + buffer.readUInt16LE(h + 26) + buffer.readUInt16LE(h + 28);
  const end = start + entry.compressedSize;
  if (end > buffer.length) return { error: "ZIP file is damaged (truncated entry)" };
  const data = buffer.subarray(start, end);

  if (entry.method === 0) {
    return data.length > maxBytes ? { error: "File is too large" } : Buffer.from(data);
  }
  if (entry.method !== 8) return { error: "Unsupported ZIP compression method" };
  try {
    return inflateRawSync(data, { maxOutputLength: maxBytes });
  } catch (err) {
    const tooBig = err instanceof RangeError || (err as { code?: string })?.code === "ERR_BUFFER_TOO_LARGE";
    return { error: tooBig ? "File is too large" : "ZIP entry could not be decompressed" };
  }
}
