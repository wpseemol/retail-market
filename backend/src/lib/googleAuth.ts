import { OAuth2Client } from "google-auth-library";
import { env } from "./env.js";

export type GoogleIdentity = {
  sub: string;
  email: string;
  emailVerified: boolean;
  givenName: string;
  familyName: string;
  picture: string | null;
};

const client = new OAuth2Client(env.googleClientId);

/**
 * Verify a Google Sign-In ID token from the frontend (GIS credential).
 * Audience must match our OAuth web client ID.
 */
export async function verifyGoogleIdToken(
  idToken: string,
): Promise<GoogleIdentity> {
  if (!env.googleClientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }

  const ticket = await client.verifyIdToken({
    idToken,
    audience: env.googleClientId,
  });

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error("Google token is missing required claims");
  }

  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: payload.email_verified === true,
    givenName: (payload.given_name ?? "").trim() || "Customer",
    familyName: (payload.family_name ?? "").trim() || "User",
    picture: payload.picture ?? null,
  };
}
