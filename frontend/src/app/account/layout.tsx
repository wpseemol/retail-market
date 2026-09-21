"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/account", label: "Profile", match: "exact" as const },
  { href: "/account/orders", label: "My orders", match: "prefix" as const },
  {
    href: "/account/addresses",
    label: "My addresses",
    match: "prefix" as const,
  },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="w-full bg-bg-base">
      <div className="border-b border-border-default bg-bg-subtle/40">
        <div className="container mx-auto px-4 sm:px-6">
          <nav
            aria-label="Account sections"
            className="flex gap-1 overflow-x-auto py-2"
          >
            {nav.map((item) => {
              const active =
                item.match === "exact"
                  ? pathname === item.href
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-brand-primary text-white"
                      : "text-text-secondary hover:text-brand-primary hover:bg-bg-subtle"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}
