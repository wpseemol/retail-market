"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export default function AuthSessionProvider({
  children,
}: {
  children: ReactNode;
}) {
  // Avoid focus/reconnect session polls flipping RefreshTokenError ↔ ok and
  // bouncing middleware between /account and /login?next=/account.
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchWhenOffline={false}>
      {children}
    </SessionProvider>
  );
}
