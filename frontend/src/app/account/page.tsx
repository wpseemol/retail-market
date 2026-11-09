"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AccountProfile from "@/components/account/AccountProfile";
import { useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/store/authSlice";

/**
 * Profile is client-rendered from the SSR-seeded Redux user + Auth.js session.
 * A second server `auth()` here used to hang the content pane on overnight
 * token refresh (sidebar stayed up because it lives in the client layout).
 * Route access is still enforced by `proxy.ts`.
 */
export default function AccountPage() {
  const router = useRouter();
  const { data, status } = useSession();
  const reduxUser = useAppSelector(selectAuthUser);

  const sessionUser =
    data?.backendUser && data.error !== "RefreshTokenError"
      ? data.backendUser
      : null;
  const user = sessionUser ?? reduxUser;

  useEffect(() => {
    if (status === "loading") return;
    if (data?.error === "RefreshTokenError" || (!user && status === "unauthenticated")) {
      router.replace("/login?next=/account");
    }
  }, [status, data?.error, user, router]);

  if (!user) {
    return (
      <main className="min-w-0 flex-1" aria-busy="true" aria-label="Loading account">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-border-default bg-bg-surface shadow-sm">
            <div className="h-28 animate-pulse bg-brand-primary/25" />
            <div className="space-y-3 p-5 sm:p-8">
              <div className="h-4 w-48 animate-pulse rounded bg-bg-subtle" />
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="size-10 animate-pulse rounded-full bg-bg-subtle"
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-4 rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm sm:p-8">
            <div className="h-6 w-40 animate-pulse rounded bg-bg-subtle" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="h-11 animate-pulse rounded bg-bg-subtle" />
              <div className="h-11 animate-pulse rounded bg-bg-subtle" />
            </div>
            <div className="h-11 animate-pulse rounded bg-bg-subtle" />
          </div>
        </div>
      </main>
    );
  }

  return <AccountProfile initialUser={user} />;
}
