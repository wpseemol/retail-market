"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logoutSession } from "@/lib/logoutSession";

function initials(first: string, last: string, email: string) {
  const value = `${first.trim()[0] ?? ""}${last.trim()[0] ?? ""}`.toUpperCase();
  return value || email.slice(0, 2).toUpperCase();
}

const links = [
  { href: "/account", label: "My account" },
  { href: "/account/orders", label: "My orders" },
  { href: "/account/addresses", label: "My addresses" },
] as const;

type AccountMenuProps = {
  onNavigate?: () => void;
  variant?: "desktop" | "mobile";
};

export default function AccountMenu({
  onNavigate,
  variant = "desktop",
}: AccountMenuProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const hydrated = useAppSelector((state) => state.auth.hydrated);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  if (!hydrated) {
    return (
      <div className="h-9 w-24 rounded bg-bg-subtle animate-pulse" aria-hidden />
    );
  }

  if (!user) {
    if (variant === "mobile") {
      return (
        <Link
          href="/auth/login"
          onClick={onNavigate}
          className="w-full text-center bg-brand-primary text-white text-sm font-semibold py-2.5 rounded hover:bg-brand-hover transition-colors"
        >
          Login / Sign Up
        </Link>
      );
    }

    return (
      <Link
        href="/auth/login"
        className="bg-brand-primary hover:bg-brand-hover text-white text-[13px] font-semibold px-4 py-2 rounded transition-colors whitespace-nowrap"
      >
        Login / Sign Up
      </Link>
    );
  }

  const name = `${user.first_name} ${user.last_name}`.trim() || "Account";
  const mark = initials(user.first_name, user.last_name, user.email);

  if (variant === "mobile") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-lg border border-border-default bg-bg-subtle/50 px-3 py-2.5">
          <span className="size-10 rounded-full bg-brand-primary text-white text-sm font-bold flex items-center justify-center">
            {mark}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">
              {name}
            </p>
            <p className="text-xs text-text-secondary truncate">{user.email}</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className="px-3 py-2 rounded-md text-sm text-text-primary hover:bg-bg-subtle"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => {
            void logoutSession(dispatch).then(() => {
              onNavigate?.();
              router.push("/auth/login");
            });
          }}
          className="w-full text-center border border-border-default text-sm font-semibold py-2.5 rounded hover:border-brand-primary hover:text-brand-primary transition-colors"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-full border border-border-default bg-bg-surface pl-1 pr-3 py-1 hover:border-brand-primary transition-colors cursor-pointer"
      >
        <span className="size-8 rounded-full bg-brand-primary text-white text-xs font-bold flex items-center justify-center">
          {mark}
        </span>
        <span className="max-w-28 truncate text-[13px] font-semibold text-text-primary">
          {user.first_name || "Account"}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-text-secondary transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-xl border border-border-default bg-bg-surface shadow-lg py-2 z-50"
        >
          <div className="px-3 pb-2 mb-1 border-b border-border-default">
            <p className="text-sm font-semibold text-text-primary truncate">
              {name}
            </p>
            <p className="text-xs text-text-secondary truncate">{user.email}</p>
          </div>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-text-primary hover:bg-bg-subtle hover:text-brand-primary"
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void logoutSession(dispatch).then(() => {
                router.push("/auth/login");
              });
            }}
            className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-bg-subtle cursor-pointer"
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
