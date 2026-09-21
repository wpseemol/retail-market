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

function getClient() {
  if (!env.googleClientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }
  return new OAuth2Client(env.googleClientId);
}

function assertAudience(aud: string | string[] | undefined) {
  const expected = env.googleClientId;
  const audiences = Array.isArray(aud) ? aud : aud ? [aud] : [];
  if (!audiences.includes(expected)) {
    throw new Error(
      `Google token audience mismatch (got ${audiences.join(",") || "none"})`,
    );
  }
}

/**
 * Verify a Google Sign-In ID token (GIS `credential` JWT).
 */
export async function verifyGoogleIdToken(
  idToken: string,
): Promise<GoogleIdentity> {
  const client = getClient();
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

/**
 * Verify a Google OAuth access token from the GIS token-client popup.
 */
export async function verifyGoogleAccessToken(
  accessToken: string,
): Promise<GoogleIdentity> {
  const client = getClient();
  const info = await client.getTokenInfo(accessToken);
  assertAudience(info.aud);

  if (!info.sub) {
    throw new Error("Google access token is missing subject");
  }

  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Google user profile");
  }

  const profile = (await response.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean | string;
    given_name?: string;
    family_name?: string;
    picture?: string;
  };

  const email = (profile.email ?? "").toLowerCase();
  if (!profile.sub || !email) {
    throw new Error("Google profile is missing required claims");
  }

  return {
    sub: profile.sub,
    email,
    emailVerified:
      profile.email_verified === true || profile.email_verified === "true",
    givenName: (profile.given_name ?? "").trim() || "Customer",
    familyName: (profile.family_name ?? "").trim() || "User",
    picture: profile.picture ?? null,
  };
}

/** Accept either GIS ID token or OAuth access token from the frontend. */
export async function verifyGoogleCredential(input: {
  idToken?: string;
  accessToken?: string;
}): Promise<GoogleIdentity> {
  if (input.idToken) {
    return verifyGoogleIdToken(input.idToken);
  }
  if (input.accessToken) {
    return verifyGoogleAccessToken(input.accessToken);
  }
  throw new Error("Missing Google credential");
}
