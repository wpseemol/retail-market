import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Shield,
  ShieldCheck,
  Store,
  UserCog,
} from "lucide-react";
import { useTheme } from "next-themes";
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
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : true;
  const logoSrc = isDark
    ? "/logo/niyenin-white.png"
    : "/logo/niyenin-dark.png";

  const links = allLinks.filter(
    (link) =>
      user && (user.role === "super_admin" || link.roles.includes(user.role)),
  );

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <img
                src={logoSrc}
                alt="Niyenin"
                className="h-8 w-auto shrink-0"
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Niyenin</span>
                <span className="truncate text-xs text-muted-foreground">
                  Dashboard
                </span>
              </div>
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
