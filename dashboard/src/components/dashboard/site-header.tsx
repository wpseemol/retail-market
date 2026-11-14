import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { NotificationsMenu } from "@/components/dashboard/notifications-menu";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

type Crumb = { label: string; to?: string };

const SEGMENT_LABELS: Record<string, string> = {
  "": "Overview",
  profile: "Profile",
  users: "Users",
  orders: "Orders",
  notifications: "Notifications",
  stores: "Stores",
  shops: "Stores",
  products: "Products",
  categories: "Categories",
  brands: "Brands",
  seo: "Search & SEO",
  content: "Content",
  faq: "FAQ page",
  terms: "Terms page",
  privacy: "Privacy policy",
  support: "Support",
  reviews: "Product reviews",
  settings: "Site settings",
  identity: "Identity",
  header: "Header",
  footer: "Footer",
  home: "Home",
  shop: "Shop",
  social: "Social",
  "social-login": "Social login",
  sms: "SMS gateway",
  whatsapp: "WhatsApp",
  email: "Email provider",
  payment: "Payment",
  shipping: "Shipping",
  analytics: "Analytics",
  pixels: "Pixels",
  history: "History",
  backups: "Backups",
  new: "Create",
  design: "Page design",
  "super-admin": "Super Admin",
  admin: "Admin",
  moderator: "Moderator",
  vendor: "Vendor",
};

function titleCase(segment: string) {
  if (/^\d+$/.test(segment)) return "Detail";
  return segment
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function crumbsFromPath(pathname: string): Crumb[] {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) {
    return [{ label: "Overview" }];
  }

  const crumbs: Crumb[] = [{ label: "Dashboard", to: "/" }];
  let acc = "";
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i]!;
    acc += `/${seg}`;
    const isLast = i === parts.length - 1;
    const label = SEGMENT_LABELS[seg] ?? titleCase(seg);
    crumbs.push(isLast ? { label } : { label, to: acc });
  }
  return crumbs;
}

export function SiteHeader() {
  const { pathname } = useLocation();
  const crumbs = crumbsFromPath(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border/80 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-1 hidden h-4 sm:block" />
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap overflow-hidden">
            {crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1;
              return (
                <Fragment key={`${crumb.label}-${index}`}>
                  {index > 0 ? (
                    <BreadcrumbSeparator className="hidden sm:block" />
                  ) : null}
                  <BreadcrumbItem
                    className={
                      index < crumbs.length - 1 ? "hidden sm:inline-flex" : undefined
                    }
                  >
                    {isLast || !crumb.to ? (
                      <BreadcrumbPage className="truncate font-medium">
                        {crumb.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link to={crumb.to} className="truncate">
                          {crumb.label}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />
        <NotificationsMenu />
      </div>
    </header>
  );
}
