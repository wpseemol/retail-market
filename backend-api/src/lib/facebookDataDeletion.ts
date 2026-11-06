import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env.js";
import { prisma } from "./prisma.js";
import { getSocialProviderConfig } from "./socialLogin.js";

export type FacebookSignedDeletion = {
  userId: string;
  algorithm: string;
};

/**
 * Meta posts `signed_request` = base64url(signature).base64url(payload JSON).
 * Signature is HMAC-SHA256 of the payload with the app secret.
 */
export function parseFacebookSignedRequest(
  signedRequest: string,
  appSecret: string,
): FacebookSignedDeletion | null {
  const parts = signedRequest.split(".", 2);
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  const [encodedSig, encodedPayload] = parts;
  let sig: Buffer;
  let payloadRaw: string;
  try {
    sig = Buffer.from(encodedSig.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    payloadRaw = Buffer.from(
      encodedPayload.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf8");
  } catch {
    return null;
  }

  const expected = createHmac("sha256", appSecret).update(encodedPayload).digest();
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;

  let payload: { user_id?: string; algorithm?: string };
  try {
    payload = JSON.parse(payloadRaw) as { user_id?: string; algorithm?: string };
  } catch {
    return null;
  }

  const algorithm = (payload.algorithm ?? "").toUpperCase();
  if (algorithm && algorithm !== "HMAC-SHA256") return null;
  const userId = typeof payload.user_id === "string" ? payload.user_id.trim() : "";
  if (!userId || userId.length > 64) return null;

  return { userId, algorithm: algorithm || "HMAC-SHA256" };
}

/**
 * Honour a Meta data-deletion callback: unlink Facebook, revoke sessions,
 * and soft-delete Facebook-only customer accounts (no password).
 */
export async function honourFacebookDataDeletion(facebookUserId: string): Promise<string> {
  const confirmationCode = `fb-${randomBytes(8).toString("hex")}`;

  const user = await prisma.user.findFirst({
    where: {
      deleted_at: null,
      provider_name: "facebook",
      provider_id: facebookUserId,
      role: "customer",
    },
    select: { id: true, password: true },
  });

  if (!user) return confirmationCode;

  await prisma.userSession.updateMany({
    where: { user_id: user.id, revoked_at: null },
    data: { revoked_at: new Date() },
  });

  if (!user.password) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        deleted_at: new Date(),
        status: "inactive",
        email: `deleted+fb+${user.id}@niyenin.invalid`,
        username: null,
        phone: null,
        provider_name: null,
        provider_id: null,
        first_name: "Deleted",
        last_name: "User",
        password: null,
        remember_token: null,
      },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { provider_name: null, provider_id: null },
    });
  }

  return confirmationCode;
}

export async function facebookDeletionStatusUrl(confirmationCode: string): Promise<string> {
  const base = env.frontendUrl.replace(/\/$/, "");
  return `${base}/privacy-policy?deletion_code=${encodeURIComponent(confirmationCode)}#data-deletion`;
}

export async function getFacebookAppSecret(): Promise<{ appId: string; appSecret: string } | null> {
  const config = await getSocialProviderConfig("facebook");
  if (!config.clientId || !config.clientSecret) return null;
  return { appId: config.clientId, appSecret: config.clientSecret };
}
