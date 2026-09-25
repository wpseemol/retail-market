import { useLocation } from "react-router-dom";
import { ApiHealthBadge } from "@/components/ApiHealthBadge";
import { NotificationsMenu } from "@/components/dashboard/notifications-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const PAGE_TITLES: Record<string, string> = {
  "/": "Overview",
  "/profile": "Profile",
  "/users": "Users",
  "/orders": "Orders",
  "/stores": "Stores",
  "/stores/new": "Create store",
  "/shops": "Stores",
  "/shops/new": "Create store",
  "/super-admin": "Super Admin",
  "/admin": "Admin",
  "/moderator": "Moderator",
  "/vendor": "Vendor",
};

export function SiteHeader() {
  const { pathname } = useLocation();
  const pageTitle =
    PAGE_TITLES[pathname] ??
    (pathname.startsWith("/users/")
      ? "Edit user"
      : pathname.startsWith("/orders/")
        ? "Order detail"
        : pathname.startsWith("/stores/") || pathname.startsWith("/shops/")
          ? "Edit store"
          : "Dashboard");

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex flex-1 items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <span className="text-muted-foreground">Management</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex items-center gap-1">
        <NotificationsMenu />
        <ApiHealthBadge />
      </div>
    </header>
  );
}
