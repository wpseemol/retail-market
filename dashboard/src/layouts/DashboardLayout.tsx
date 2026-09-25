import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { MotionProvider } from "@/components/motion";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function DashboardLayout() {
  return (
    <MotionProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </MotionProvider>
  );
}
