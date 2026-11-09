"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Heart,
  LogOut,
  MapPin,
  Package,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/store/authSlice";
import { logoutSession } from "@/lib/logoutSession";
import {
  AvatarPresetSvg,
  isAvatarPresetId,
} from "@/lib/avatarPresets";
import type { ApiUser } from "@/lib/api";

const nav = [
  {
    href: "/account",
    label: "Profile",
    match: "exact" as const,
    icon: UserRound,
  },
  {
    href: "/account/orders",
    label: "My Orders",
    match: "prefix" as const,
    icon: Package,
  },
  {
    href: "/account/addresses",
    label: "My Addresses",
    match: "prefix" as const,
    icon: MapPin,
  },
  {
    href: "/wishlist",
    label: "Wishlist",
    match: "exact" as const,
    icon: Heart,
  },
];

function initials(user: ApiUser) {
  const a = user.first_name?.trim()?.[0] ?? "";
  const b = user.last_name?.trim()?.[0] ?? "";
  const value = `${a}${b}`.toUpperCase();
  return value || user.email.slice(0, 2).toUpperCase();
}

function providerLabel(provider?: string | null) {
  if (!provider) return "Email account";
  if (provider === "google") return "Google Account";
  return `${provider} account`;
}

function SidebarAvatar({ user }: { user: ApiUser }) {
  if (user.avatar?.path) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={user.avatar_id ?? user.avatar.path}
        src={user.avatar.path}
        alt=""
        className="size-full object-cover"
      />
    );
  }
  if (user.avatar_preset && isAvatarPresetId(user.avatar_preset)) {
    return <AvatarPresetSvg id={user.avatar_preset} className="size-full" />;
  }
  return (
    <span className="text-lg font-bold text-white">{initials(user)}</span>
  );
}

export default function AccountSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);

  const fullName = user
    ? `${user.first_name} ${user.last_name}`.trim()
    : "";

  return (
    <aside className="flex w-full flex-col gap-4 lg:sticky lg:top-24 lg:w-70 lg:shrink-0">
      <div className="overflow-hidden rounded-2xl border border-border-default bg-bg-surface shadow-sm">
        <div className="flex flex-col items-center px-5 pb-5 pt-7 text-center">
          <div
            className="mb-3 flex size-22 items-center justify-center overflow-hidden rounded-full bg-brand-primary text-white shadow-sm ring-4 ring-brand-tint"
            aria-hidden
          >
            {user ? (
              <SidebarAvatar user={user} />
            ) : (
              <span className="size-8 animate-pulse rounded-full bg-white/30" />
            )}
          </div>
          <p className="m-0 truncate text-base font-semibold text-text-primary">
            {fullName || "My account"}
          </p>
          <p className="m-0 mt-0.5 truncate text-sm text-text-secondary">
            {user?.email ?? "…"}
          </p>
          {user ? (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center rounded-full border border-border-default bg-bg-base px-2.5 py-0.5 text-[11px] font-medium text-text-secondary">
                {providerLabel(user.provider_name)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                <span
                  className="size-1.5 rounded-full bg-emerald-500"
                  aria-hidden
                />
                {user.status === "active" ? "Active" : user.status}
              </span>
            </div>
          ) : null}
        </div>

        <nav
          aria-label="Account sections"
          className="border-t border-border-default/70 px-2 py-2"
        >
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {nav.map((item) => {
              const active =
                item.match === "exact"
                  ? pathname === item.href
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-brand-primary text-white shadow-sm"
                        : "text-text-secondary hover:bg-brand-tint/60 hover:text-brand-primary"
                    }`}
                  >
                    <Icon
                      className="size-4 shrink-0"
                      strokeWidth={1.9}
                      aria-hidden
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={() => {
                  void logoutSession(dispatch).then(() => {
                    router.push("/login");
                  });
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-rose-500/8 hover:text-rose-600 cursor-pointer"
              >
                <LogOut
                  className="size-4 shrink-0"
                  strokeWidth={1.9}
                  aria-hidden
                />
                Logout
              </button>
            </li>
          </ul>
        </nav>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-brand-primary to-brand-hover px-5 py-6 text-white shadow-sm">
        <div
          className="pointer-events-none absolute -right-6 -top-6 size-28 rounded-full bg-white/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-8 left-8 size-24 rounded-full bg-white/10"
          aria-hidden
        />
        <ShoppingBag
          className="relative mb-3 size-9 opacity-90"
          strokeWidth={1.6}
          aria-hidden
        />
        <p className="relative m-0 text-base font-semibold leading-snug">
          Fresh deals every day
        </p>
        <p className="relative m-0 mt-1 text-sm text-white/85">
          Browse the shop for new arrivals and daily offers.
        </p>
        <Link
          href="/shop"
          className="relative mt-4 inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-brand-primary transition-colors hover:bg-brand-tint"
        >
          Browse Shop
        </Link>
      </div>
    </aside>
  );
}
