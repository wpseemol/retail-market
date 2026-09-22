import { useEffect, useState } from "react";
import {
  ChevronsUpDown,
  LogOut,
  Moon,
  Settings,
  Sun,
  UserRound,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { StaffUser } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

function initials(user: StaffUser) {
  const first = user.first_name?.[0] ?? "";
  const last = user.last_name?.[0] ?? "";
  return (first + last).toUpperCase() || user.role.slice(0, 2).toUpperCase();
}

export function NavUser({ user }: { user: StaffUser }) {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const name = `${user.first_name} ${user.last_name}`.trim();
  const roleLabel = user.role.replace("_", " ");

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? (theme ?? "dark") : "dark";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-brand-tint text-brand-deep">
                  {initials(user)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{name}</span>
                <span className="truncate text-xs capitalize text-muted-foreground">
                  {roleLabel}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-brand-tint text-brand-deep">
                    {initials(user)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{name}</span>
                  <span className="truncate text-xs capitalize text-muted-foreground">
                    {roleLabel}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              <UserRound />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Settings />
                Settings
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-44">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Preferences
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={currentTheme}
                  onValueChange={setTheme}
                >
                  <DropdownMenuRadioItem value="light">
                    <Sun />
                    Light mode
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    <Moon />
                    Dark mode
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
