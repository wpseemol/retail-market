import type { Response } from "express";
import { readMediaFile } from "./storage/files.js";
import { SELLER_KYC_IMAGE_MAX_BYTES } from "./sellerKycImage.js";

/** Stream a stored KYC image to an already-authorized response. */
export async function sendSellerKycFile(
  res: Response,
  media: {
    file_path: string;
    file_name: string;
    mime_type: string | null;
    disk: string;
  },
) {
  const body = await readMediaFile(
    media.file_path,
    media.file_name,
    SELLER_KYC_IMAGE_MAX_BYTES,
    media.disk,
  );
  if (!body) {
    return res.status(404).json({ message: "Document file not found", code: "DOC_FILE_MISSING" });
  }
  res.setHeader("Content-Type", media.mime_type || "application/octet-stream");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(200).send(body);
}
