"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, ShoppingCart, UserRound } from "lucide-react";
import { useI18n } from "@/components/providers/LocaleProvider";
import { useAppSelector } from "@/store/hooks";
import { selectCartItemCount } from "@/store/cartSlice";
import { selectAuthUser } from "@/store/authSlice";
import { format } from "@/i18n/config";
import { cn } from "@/lib/utils";

type Props = {
  /** When true, slide the bar off-screen (shared with sticky header). */
  hidden?: boolean;
};

function tabActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MobileAppTabBar({ hidden = false }: Props) {
  const pathname = usePathname();
  const { t } = useI18n();
  const cartCount = useAppSelector(selectCartItemCount);
  const user = useAppSelector(selectAuthUser);
  const accountHref = user ? "/account" : "/login";

  const tabs = [
    {
      id: "home",
      href: "/",
      label: t.mobileNav.home,
      icon: Home,
      match: "/",
    },
    {
      id: "shop",
      href: "/shop",
      label: t.mobileNav.shop,
      icon: ShoppingBag,
      match: "/shop",
    },
    {
      id: "cart",
      href: "/cart",
      label: t.mobileNav.cart,
      icon: ShoppingCart,
      match: "/cart",
      badge: cartCount,
    },
    {
      id: "account",
      href: accountHref,
      label: t.mobileNav.account,
      icon: UserRound,
      match: user ? "/account" : "/login",
    },
  ] as const;

  return (
    <nav
      aria-label={t.mobileNav.label}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 border-t border-border-default bg-bg-base/95 backdrop-blur supports-backdrop-filter:bg-bg-base/90 pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ease-out will-change-transform lg:hidden",
        hidden && "translate-y-full",
      )}
    >
      <ul className="mx-auto grid h-14 max-w-lg grid-cols-4 list-none m-0 p-0">
        {tabs.map((tab) => {
          const active = tabActive(pathname, tab.match);
          const Icon = tab.icon;
          const badge = "badge" in tab ? tab.badge : 0;
          return (
            <li key={tab.id} className="min-w-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                aria-label={
                  tab.id === "cart" && badge > 0
                    ? format(t.mobileNav.cartCount, { count: badge })
                    : tab.label
                }
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors",
                  active
                    ? "text-brand-primary"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                <span className="relative inline-flex">
                  <Icon
                    className="size-5"
                    strokeWidth={active ? 2.4 : 2}
                    aria-hidden
                  />
                  {badge > 0 ? (
                    <span
                      aria-hidden
                      className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-hover px-1 text-[9px] font-semibold text-white"
                    >
                      {badge > 99 ? "99+" : badge}
                    </span>
                  ) : null}
                </span>
                <span className="truncate max-w-full">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
