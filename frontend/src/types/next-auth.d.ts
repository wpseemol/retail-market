import type { DefaultSession } from "next-auth";
import type { ApiUser } from "@/lib/api";

/** Shared session fields (Auth.js client uses `@auth/core/types.Session`). */
type AppSessionFields = {
  backendUser?: ApiUser;
  /** Short-lived backend access JWT (prefer server-only use). */
  accessToken?: string;
  error?: string;
  user: DefaultSession["user"] & {
    id?: string;
  };
};

type AppUserFields = {
  accessToken?: string;
  refreshToken?: string;
  backendUser?: ApiUser;
};

type AppJwtFields = {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  backendUser?: ApiUser;
  error?: string;
};

declare module "next-auth" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- module augmentation
  interface Session extends AppSessionFields {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- module augmentation
  interface User extends AppUserFields {}
}

/** Required: `getSession()` / `useSession()` return this Session, not `next-auth`'s re-export. */
declare module "@auth/core/types" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- module augmentation
  interface Session extends AppSessionFields {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- module augmentation
  interface User extends AppUserFields {}
}

declare module "next-auth/jwt" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- module augmentation
  interface JWT extends AppJwtFields {}
}

declare module "@auth/core/jwt" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- module augmentation
  interface JWT extends AppJwtFields {}
}
