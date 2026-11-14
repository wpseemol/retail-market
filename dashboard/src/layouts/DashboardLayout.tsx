import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { MotionProvider, m, useMotionSafe } from "@/components/motion";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

function PageTransition() {
  const { pathname } = useLocation();
  const { pageEnter } = useMotionSafe();
  return (
    <m.div
      key={pathname}
      initial="hidden"
      animate="show"
      variants={pageEnter}
      className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 p-4 md:gap-6 md:p-6 lg:p-8"
    >
      <Outlet />
    </m.div>
  );
}

export function DashboardLayout() {
  return (
    <MotionProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-muted/25">
          <SiteHeader />
          <div className="relative flex flex-1 flex-col">
            <PageTransition />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </MotionProvider>
  );
}
