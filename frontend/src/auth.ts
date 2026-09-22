import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { ApiUser, AuthTokenResponse } from "@/lib/api";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8001";

/** Access JWT lifetime buffer before refresh (backend default access ≈ 1h). */
const ACCESS_TOKEN_TTL_MS = 55 * 60 * 1000;

export type BackendAuthUser = {
  id: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken: string;
  backendUser: ApiUser;
};

async function callBackendAuth(
  path: string,
  body: unknown,
): Promise<AuthTokenResponse> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as AuthTokenResponse & {
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? "Authentication failed");
  }

  if (!data.user || data.user.role !== "customer") {
    throw new Error("Only customer accounts can sign in on the storefront");
  }

  return data;
}

function toAuthUser(data: AuthTokenResponse): BackendAuthUser {
  return {
    id: data.user.id,
    email: data.user.email,
    name: `${data.user.first_name} ${data.user.last_name}`.trim(),
    accessToken: data.accessToken ?? data.token,
    refreshToken: data.refreshToken,
    backendUser: data.user,
  };
}

async function refreshBackendTokens(refreshToken: string) {
  const res = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  const data = (await res.json().catch(() => ({}))) as AuthTokenResponse & {
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? "Session expired");
  }

  return data;
}

/**
 * Auth.js (NextAuth v5) — encrypted httpOnly JWT cookie.
 * Backend still issues access + refresh JWTs; we store them in the Auth.js token
 * (never localStorage). See https://authjs.dev
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 365,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "");
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;
        try {
          const data = await callBackendAuth("/api/auth/login", {
            email,
            password,
          });
          return toAuthUser(data);
        } catch {
          return null;
        }
      },
    }),
    Credentials({
      id: "register",
      name: "Register",
      credentials: {
        first_name: {},
        last_name: {},
        email: {},
        password: {},
        phone: {},
      },
      async authorize(credentials) {
        try {
          const data = await callBackendAuth("/api/auth/register", {
            first_name: String(credentials?.first_name ?? ""),
            last_name: String(credentials?.last_name ?? ""),
            email: String(credentials?.email ?? ""),
            password: String(credentials?.password ?? ""),
            phone: credentials?.phone
              ? String(credentials.phone)
              : undefined,
          });
          return toAuthUser(data);
        } catch {
          return null;
        }
      },
    }),
    Credentials({
      id: "google-backend",
      name: "Google",
      credentials: {
        accessToken: {},
        idToken: {},
      },
      async authorize(credentials) {
        try {
          const data = await callBackendAuth("/api/auth/google", {
            accessToken: credentials?.accessToken
              ? String(credentials.accessToken)
              : undefined,
            idToken: credentials?.idToken
              ? String(credentials.idToken)
              : undefined,
          });
          return toAuthUser(data);
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as BackendAuthUser;
        token.accessToken = u.accessToken;
        token.refreshToken = u.refreshToken;
        token.backendUser = u.backendUser;
        token.accessTokenExpires = Date.now() + ACCESS_TOKEN_TTL_MS;
        token.error = undefined;
        return token;
      }

      // Client asked to sync user profile (avatar / details).
      if (trigger === "update" && session?.backendUser) {
        token.backendUser = session.backendUser as ApiUser;
        return token;
      }

      if (
        typeof token.accessTokenExpires === "number" &&
        Date.now() < token.accessTokenExpires
      ) {
        return token;
      }

      if (!token.refreshToken) {
        return { ...token, error: "RefreshTokenError" };
      }

      try {
        const data = await refreshBackendTokens(String(token.refreshToken));
        return {
          ...token,
          accessToken: data.accessToken ?? data.token,
          refreshToken: data.refreshToken,
          backendUser: data.user ?? token.backendUser,
          accessTokenExpires: Date.now() + ACCESS_TOKEN_TTL_MS,
          error: undefined,
        };
      } catch {
        return { ...token, error: "RefreshTokenError" };
      }
    },
    async session({ session, token }) {
      // Expose user to the client; tokens stay in the encrypted JWT cookie only
      // and are read server-side via getToken / auth().
      session.user = {
        ...session.user,
        id: (token.backendUser as ApiUser | undefined)?.id ?? "",
        email: (token.backendUser as ApiUser | undefined)?.email ?? "",
        name:
          token.backendUser != null
            ? `${(token.backendUser as ApiUser).first_name} ${(token.backendUser as ApiUser).last_name}`.trim()
            : session.user?.name,
      };
      session.backendUser = token.backendUser as ApiUser | undefined;
      session.accessToken = token.accessToken as string | undefined;
      session.error = token.error as string | undefined;
      return session;
    },
  },
});
