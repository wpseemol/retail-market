import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfirmProvider } from "@/components/providers/ConfirmProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConnectionWatcher } from "@/components/providers/ConnectionWatcher";
import { NavigationProgress } from "@/components/providers/NavigationProgress";
import { SiteBrandingHydrator } from "@/lib/siteBranding";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <TooltipProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <ConnectionWatcher />
            <NavigationProgress />
            <SiteBrandingHydrator />
            <App />
          </BrowserRouter>
          <Toaster />
        </ConfirmProvider>
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
);
