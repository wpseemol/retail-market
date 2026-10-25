import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const LIVE_API_URL = "https://niyenin-api.wpseemol.site";
const LIVE_STOREFRONT_URL = "https://niyenin-frontend.vercel.app";
const LIVE_DASHBOARD_URL = "https://niyenin-dashboard.vercel.app";

function trimUrl(value: string) {
  return value.trim().replace(/\/$/, "");
}

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), "VITE_");
  const onVercel = process.env.VERCEL === "1";

  const apiUrl = trimUrl(
    process.env.VITE_API_URL ||
      fileEnv.VITE_API_URL ||
      (onVercel ? LIVE_API_URL : "http://localhost:8001"),
  );
  const storefrontUrl = trimUrl(
    process.env.VITE_STOREFRONT_URL ||
      fileEnv.VITE_STOREFRONT_URL ||
      (onVercel ? LIVE_STOREFRONT_URL : "http://localhost:3000"),
  );
  const appUrl = trimUrl(
    process.env.VITE_APP_URL ||
      fileEnv.VITE_APP_URL ||
      (onVercel ? LIVE_DASHBOARD_URL : "http://localhost:4173"),
  );

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      "import.meta.env.VITE_API_URL": JSON.stringify(apiUrl),
      "import.meta.env.VITE_STOREFRONT_URL": JSON.stringify(storefrontUrl),
      "import.meta.env.VITE_APP_URL": JSON.stringify(appUrl),
    },
    server: {
      port: 4173,
      strictPort: true,
    },
    preview: {
      port: 4173,
      strictPort: true,
    },
  };
});
