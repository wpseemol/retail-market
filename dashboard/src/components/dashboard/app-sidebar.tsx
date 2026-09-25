import type { ComponentProps } from "react";
import {
  ClipboardList,
  FolderTree,
  LayoutDashboard,
  Package,
  Shield,
  ShieldCheck,
  Store,
  Tag,
  UserCog,
  Users,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { NavUser } from "@/components/dashboard/nav-user";
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
import { useAuthStore } from "@/store/auth";

const ROLE_HOME: Record<StaffRole, string> = {
  super_admin: "/",
  admin: "/",
  moderator: "/moderator",
  vendor: "/vendor",
};

const topLinks: Array<{
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: StaffRole[];
  end?: boolean;
}> = [
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
    roles: ["super_admin", "vendor"],
  },
];

const productSubLinks: Array<{
  to: string;
  label: string;
  icon: typeof Package;
  roles: StaffRole[];
  end?: boolean;
}> = [
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

const roleLinks: Array<{
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: StaffRole[];
}> = [
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

function canSee(roles: StaffRole[], userRole: StaffRole) {
  return userRole === "super_admin" || roles.includes(userRole);
}

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const user = useAuthStore((state) => state.user);
  const { pathname } = useLocation();
  const logoHref = user ? ROLE_HOME[user.role] : "/";

  const links = topLinks.filter(
    (link) => user && canSee(link.roles, user.role),
  );
  const catalogLinks = productSubLinks.filter(
    (link) => user && canSee(link.roles, user.role),
  );
  const workspaceRoleLinks = roleLinks.filter(
    (link) => user && canSee(link.roles, user.role),
  );

  const catalogOpen =
    pathname.startsWith("/products") ||
    pathname.startsWith("/categories") ||
    pathname.startsWith("/brands");

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
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
                  <span className="truncate text-[11px] text-white/75">
                    Dashboard
                  </span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((link) => {
                const active = link.end
                  ? pathname === link.to
                  : pathname === link.to || pathname.startsWith(`${link.to}/`);

                return (
                  <SidebarMenuItem key={link.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={link.label}
                    >
                      <NavLink to={link.to} end={link.end}>
                        <link.icon />
                        <span>{link.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {catalogLinks.length > 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={catalogOpen}
                    tooltip="Catalog"
                  >
                    <NavLink to="/products">
                      <Package />
                      <span>Catalog</span>
                    </NavLink>
                  </SidebarMenuButton>
                  <SidebarMenuSub>
                    {catalogLinks.map((link) => {
                      const isActive =
                        link.to === "/products"
                          ? pathname === "/products" ||
                            pathname.startsWith("/products/")
                          : pathname === link.to ||
                            pathname.startsWith(`${link.to}/`);

                      return (
                        <SidebarMenuSubItem key={link.to}>
                          <SidebarMenuSubButton asChild isActive={isActive}>
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

              {workspaceRoleLinks.map((link) => {
                const active =
                  pathname === link.to || pathname.startsWith(`${link.to}/`);
                return (
                  <SidebarMenuItem key={link.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={link.label}
                    >
                      <NavLink to={link.to}>
                        <link.icon />
                        <span>{link.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>{user ? <NavUser user={user} /> : null}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
