import type { ComponentProps } from "react";
import {
  LayoutDashboard,
  Shield,
  ShieldCheck,
  Store,
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

const allLinks: Array<{
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
    to: "/users",
    label: "Users",
    icon: Users,
    roles: ["super_admin"],
  },
  {
    to: "/shops",
    label: "Shops",
    icon: Store,
    roles: ["super_admin", "vendor"],
  },
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

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const user = useAuthStore((state) => state.user);
  const { pathname } = useLocation();
  const logoHref = user ? ROLE_HOME[user.role] : "/";

  const links = allLinks.filter(
    (link) =>
      user && (user.role === "super_admin" || link.roles.includes(user.role)),
  );

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
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/15">
                  <img
                    src="/logo/niyenin-white.png"
                    alt=""
                    className="h-5 w-auto"
                  />
                </span>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-white">
                    Niyenin
                  </span>
                  <span className="truncate text-xs text-white/80">
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>{user ? <NavUser user={user} /> : null}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
