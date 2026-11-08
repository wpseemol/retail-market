"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import type { ReactNode } from "react";

export default function AuthSessionProvider({
  children,
  session = null,
}: {
  children: ReactNode;
  /** From root layout `auth()` — avoids a client round-trip on every reload. */
  session?: Session | null;
}) {
  // Avoid focus/reconnect session polls flipping RefreshTokenError ↔ ok and
  // bouncing middleware between /account and /login?next=/account.
  return (
    <SessionProvider
      session={session}
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
    >
      {children}
    </SessionProvider>
  );
}
