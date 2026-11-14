import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { MotionProvider, m, useMotionSafe } from "@/components/motion";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

/**
 * Nested settings tabs (Identity → Header → …) share one chrome.
 * Keying the full pathname remounts the whole page and causes a jump —
 * keep `/settings/*` under a stable transition key.
 */
function routeTransitionKey(pathname: string) {
  if (pathname === "/settings" || pathname.startsWith("/settings/")) {
    return "/settings";
  }
  return pathname;
}

/** Route enter: `pageEnter` (fade + slight x). Login keeps `FadeUp` rise separately. */
function PageTransition() {
  const { pathname } = useLocation();
  const { pageEnter } = useMotionSafe();
  return (
    <m.div
      key={routeTransitionKey(pathname)}
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
