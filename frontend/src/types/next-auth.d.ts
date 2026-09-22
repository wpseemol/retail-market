import type { DefaultSession } from "next-auth";
import type { ApiUser } from "@/lib/api";

declare module "next-auth" {
  interface Session {
    backendUser?: ApiUser;
    /** Short-lived backend access JWT (prefer server-only use). */
    accessToken?: string;
    error?: string;
    user: DefaultSession["user"] & {
      id?: string;
    };
  }

  interface User {
    accessToken?: string;
    refreshToken?: string;
    backendUser?: ApiUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    backendUser?: ApiUser;
    error?: string;
  }
}
