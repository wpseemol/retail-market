import type { ComponentProps, ReactNode } from "react";
import {
  CircleHelp,
  ClipboardList,
  FolderTree,
  LayoutDashboard,
  MessageSquareText,
  Package,
  Palette,
  ScrollText,
  SearchCheck,
  Settings2,
  Shield,
  ShieldCheck,
  Store,
  Tag,
  UserCog,
  Users,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { NavUser } from "@/components/dashboard/nav-user";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { StaffRole } from "@/lib/api";
import {
  CONTENT_PAGE_ROLES,
  REVIEW_ROLES,
  SEO_ROLES,
  STORE_ROLES,
  SYSTEM_SETTINGS_ROLES,
} from "@/lib/rbac";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

const ROLE_HOME: Record<StaffRole, string> = {
  super_admin: "/",
  admin: "/",
  moderator: "/moderator",
  vendor: "/vendor",
};

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: readonly StaffRole[];
  end?: boolean;
  only?: boolean;
};

const workspaceLinks: NavItem[] = [
  {
    to: "/",
    label: "Overview",
    icon: LayoutDashboard,
    roles: ["super_admin", "admin"],
    end: true,
  },
  {
    to: "/orders",
    label: "Orders",
    icon: ClipboardList,
    roles: ["super_admin", "admin", "moderator", "vendor"],
  },
  {
    to: "/users",
    label: "Users",
    icon: Users,
    roles: ["super_admin"],
  },
  {
    to: "/stores",
    label: "Stores",
    icon: Store,
    roles: STORE_ROLES,
  },
];

const catalogLinks: NavItem[] = [
  {
    to: "/products",
    label: "Products",
    icon: Package,
    roles: ["super_admin", "admin", "moderator", "vendor"],
    end: true,
  },
  {
    to: "/categories",
    label: "Categories",
    icon: FolderTree,
    roles: ["super_admin", "admin", "moderator", "vendor"],
  },
  {
    to: "/brands",
    label: "Brands",
    icon: Tag,
    roles: ["super_admin", "admin", "moderator", "vendor"],
  },
];

const marketingLinks: NavItem[] = [
  {
    to: "/seo",
    label: "Search & SEO",
    icon: SearchCheck,
    roles: SEO_ROLES,
  },
];

const contentLinks: NavItem[] = [
  {
    to: "/content/faq",
    label: "FAQ page",
    icon: CircleHelp,
    roles: CONTENT_PAGE_ROLES,
  },
  {
    to: "/content/terms",
    label: "Terms page",
    icon: ScrollText,
    roles: CONTENT_PAGE_ROLES,
  },
  {
    to: "/content/privacy",
    label: "Privacy policy",
    icon: Shield,
    roles: CONTENT_PAGE_ROLES,
  },
];

const vendorShortcuts: NavItem[] = [
  {
    to: "/stores",
    label: "My store page",
    icon: Palette,
    roles: ["vendor"],
    only: true,
  },
  {
    to: "/brands?mine=1",
    label: "My brands",
    icon: Tag,
    roles: ["vendor"],
    only: true,
  },
];

const supportLinks: NavItem[] = [
  {
    to: "/support/reviews",
    label: "Product reviews",
    icon: MessageSquareText,
    roles: REVIEW_ROLES,
  },
];

const systemLinks: NavItem[] = [
  {
    to: "/settings",
    label: "Site settings",
    icon: Settings2,
    roles: SYSTEM_SETTINGS_ROLES,
  },
];

const roleLinks: NavItem[] = [
  {
    to: "/super-admin",
    label: "Super Admin",
    icon: Shield,
    roles: ["super_admin"],
  },
  {
    to: "/admin",
    label: "Admin",
    icon: ShieldCheck,
    roles: ["admin", "super_admin"],
  },
  {
    to: "/moderator",
    label: "Moderator",
    icon: UserCog,
    roles: ["moderator", "super_admin"],
  },
  {
    to: "/vendor",
    label: "Vendor",
    icon: Store,
    roles: ["vendor", "super_admin"],
  },
];

function canSee(roles: readonly StaffRole[], userRole: StaffRole, only?: boolean) {
  if (only) return roles.includes(userRole);
  return userRole === "super_admin" || roles.includes(userRole);
}

function filterLinks(items: NavItem[], role: StaffRole | undefined) {
  if (!role) return [];
  return items.filter((link) => canSee(link.roles, role, link.only));
}

function isActivePath(pathname: string, search: string, to: string, end?: boolean) {
  const [path, query] = to.split("?");
  if (query) return pathname === path && search === `?${query}`;
  if (end) return pathname === path;
  return pathname === path || pathname.startsWith(`${path}/`);
}

function NavGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/90">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>{children}</SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function SimpleLink({
  link,
  pathname,
  search,
}: {
  link: NavItem;
  pathname: string;
  search: string;
}) {
  const active = isActivePath(pathname, search, link.to, link.end);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={link.label}
        className={cn(
          active &&
            "bg-brand-tint/70 font-medium text-brand-deep data-[active=true]:bg-brand-tint/70 data-[active=true]:text-brand-deep",
        )}
      >
        <NavLink to={link.to} end={link.end}>
          <link.icon />
          <span>{link.label}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const user = useAuthStore((state) => state.user);
  const { pathname, search } = useLocation();
  const logoHref = user ? ROLE_HOME[user.role] : "/";
  const role = user?.role;

  const workspace = filterLinks(workspaceLinks, role);
  const catalog = filterLinks(catalogLinks, role);
  const marketing = filterLinks(marketingLinks, role);
  const content = filterLinks(contentLinks, role);
  const vendorOnly = filterLinks(vendorShortcuts, role);
  const support = filterLinks(supportLinks, role);
  const system = filterLinks(systemLinks, role);
  const roles = filterLinks(roleLinks, role);

  const catalogOpen =
    pathname.startsWith("/products") ||
    pathname.startsWith("/categories") ||
    pathname.startsWith("/brands");

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-sidebar-border/60">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip="Home"
              className="bg-brand-primary text-white hover:bg-brand-hover hover:text-white active:bg-brand-hover active:text-white data-[active=true]:bg-brand-primary data-[active=true]:text-white"
            >
              <NavLink to={logoHref} end={logoHref === "/"}>
                <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/20 shadow-sm ring-1 ring-white/25">
                  <img
                    src="/logo/niyenin-white.png"
                    alt=""
                    className="size-5 object-contain"
                  />
                </span>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold tracking-tight text-white">
                    Niyenin
                  </span>
                  <span className="truncate text-[11px] text-white/75">Dashboard</span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-1 scroll-smooth">
        <FadeIn>
          <Stagger className="flex flex-col gap-1">
            {workspace.length > 0 ? (
              <StaggerItem>
                <NavGroup label="Workspace">
                  {workspace.map((link) => (
                    <SimpleLink
                      key={link.to}
                      link={link}
                      pathname={pathname}
                      search={search}
                    />
                  ))}

                  {catalog.length > 0 ? (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={catalogOpen}
                        tooltip="Catalog"
                        className={cn(
                          catalogOpen &&
                            "bg-brand-tint/70 font-medium text-brand-deep data-[active=true]:bg-brand-tint/70 data-[active=true]:text-brand-deep",
                        )}
                      >
                        <NavLink to="/products">
                          <Package />
                          <span>Catalog</span>
                        </NavLink>
                      </SidebarMenuButton>
                      <SidebarMenuSub>
                        {catalog.map((link) => {
                          const active = isActivePath(
                            pathname,
                            search,
                            link.to,
                            link.end,
                          );
                          return (
                            <SidebarMenuSubItem key={link.to}>
                              <SidebarMenuSubButton asChild isActive={active}>
                                <NavLink to={link.to} end={link.end}>
                                  <link.icon />
                                  <span>{link.label}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </SidebarMenuItem>
                  ) : null}

                  {roles.map((link) => (
                    <SimpleLink
                      key={link.to}
                      link={link}
                      pathname={pathname}
                      search={search}
                    />
                  ))}
                </NavGroup>
              </StaggerItem>
            ) : null}

            {marketing.length > 0 || vendorOnly.length > 0 ? (
              <StaggerItem>
                <NavGroup label="Marketing">
                  {[...marketing, ...vendorOnly].map((link) => (
                    <SimpleLink
                      key={link.to}
                      link={link}
                      pathname={pathname}
                      search={search}
                    />
                  ))}
                </NavGroup>
              </StaggerItem>
            ) : null}

            {content.length > 0 ? (
              <StaggerItem>
                <NavGroup label="Content">
                  {content.map((link) => (
                    <SimpleLink
                      key={link.to}
                      link={link}
                      pathname={pathname}
                      search={search}
                    />
                  ))}
                </NavGroup>
              </StaggerItem>
            ) : null}

            {support.length > 0 ? (
              <StaggerItem>
                <NavGroup label="Support">
                  {support.map((link) => (
                    <SimpleLink
                      key={link.to}
                      link={link}
                      pathname={pathname}
                      search={search}
                    />
                  ))}
                </NavGroup>
              </StaggerItem>
            ) : null}

            {system.length > 0 ? (
              <StaggerItem>
                <NavGroup label="System">
                  {system.map((link) => (
                    <SimpleLink
                      key={link.to}
                      link={link}
                      pathname={pathname}
                      search={search}
                    />
                  ))}
                </NavGroup>
              </StaggerItem>
            ) : null}
          </Stagger>
        </FadeIn>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60">
        {user ? <NavUser user={user} /> : null}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
