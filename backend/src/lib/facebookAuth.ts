import type { GoogleIdentity } from "./googleAuth.js";

const GRAPH = "https://graph.facebook.com/v21.0";

export type SocialIdentity = GoogleIdentity;

/**
 * Verify a Facebook Login user access token against our app
 * (`debug_token` with `app_id|app_secret`), then read the profile.
 */
export async function verifyFacebookAccessToken(
  accessToken: string,
  appId: string,
  appSecret: string,
): Promise<SocialIdentity> {
  const debugUrl = new URL(`${GRAPH}/debug_token`);
  debugUrl.searchParams.set("input_token", accessToken);
  debugUrl.searchParams.set("access_token", `${appId}|${appSecret}`);

  const debugRes = await fetch(debugUrl);
  if (!debugRes.ok) throw new Error("Facebook token check failed");
  const debug = (await debugRes.json()) as {
    data?: { is_valid?: boolean; app_id?: string; user_id?: string };
  };
  if (!debug.data?.is_valid || debug.data.app_id !== appId || !debug.data.user_id) {
    throw new Error("Facebook token is invalid for this app");
  }

  const meUrl = new URL(`${GRAPH}/me`);
  meUrl.searchParams.set("fields", "id,email,first_name,last_name,picture.type(large)");
  meUrl.searchParams.set("access_token", accessToken);

  const meRes = await fetch(meUrl);
  if (!meRes.ok) throw new Error("Failed to fetch Facebook profile");
  const me = (await meRes.json()) as {
    id?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    picture?: { data?: { url?: string } };
  };

  if (!me.id || me.id !== debug.data.user_id) {
    throw new Error("Facebook profile does not match token");
  }

  return {
    sub: me.id,
    email: (me.email ?? "").toLowerCase(),
    // Facebook only returns emails the user has confirmed.
    emailVerified: Boolean(me.email),
    givenName: (me.first_name ?? "").trim() || "Customer",
    familyName: (me.last_name ?? "").trim() || "User",
    picture: me.picture?.data?.url ?? null,
  };
}
