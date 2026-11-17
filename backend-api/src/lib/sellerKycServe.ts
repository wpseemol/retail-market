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
    collection_name?: string | null;
  },
) {
  if (media.collection_name && media.collection_name !== "seller_kyc") {
    return res.status(404).json({ message: "Document not found" });
  }
  if (media.file_path.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "") !== "seller-kyc") {
    return res.status(404).json({ message: "Document not found" });
  }
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
  // Generic name — never reflect original_name (user-controlled).
  res.setHeader("Content-Disposition", 'inline; filename="kyc.webp"');
  return res.status(200).send(body);
}
