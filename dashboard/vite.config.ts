import fs from "node:fs";
import path from "path";
import { defineConfig, loadEnv, type ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const LIVE_API_URL = "https://api.niyenin.com";
const LIVE_STOREFRONT_URL = "https://www.niyenin.com";
const LIVE_DASHBOARD_URL = "https://dashboard.niyenin.com";

function trimUrl(value: string) {
  return value.trim().replace(/\/$/, "");
}

function readModeEnv(mode: string) {
  const name = mode === "production" ? ".env.prod" : ".env.dev";
  const filePath = path.resolve(process.cwd(), name);
  const out: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return out;
  for (const raw of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export default defineConfig(({ mode }) => {
  const fileEnv = { ...loadEnv(mode, process.cwd(), ""), ...readModeEnv(mode) };
  const onVercel = process.env.VERCEL === "1";

  const apiUrl = trimUrl(
    process.env.VITE_API_URL ||
      fileEnv.VITE_API_URL ||
      (onVercel ? LIVE_API_URL : "http://localhost:8001"),
  );
  const publicKey = (process.env.API_PUBLIC_KEY || fileEnv.API_PUBLIC_KEY || "").trim();
  const secretKey = (process.env.API_SECRET_KEY || fileEnv.API_SECRET_KEY || "").trim();
  const apiProxy: Record<string, ProxyOptions> = {
    "/api": {
      target: apiUrl,
      changeOrigin: true,
      secure: true,
      configure(proxy) {
        proxy.on("proxyReq", (proxyReq) => {
          if (publicKey) proxyReq.setHeader("X-Public-Key", publicKey);
          if (secretKey) proxyReq.setHeader("X-Api-Secret", secretKey);
        });
      },
    },
  };
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
      // The browser calls this app. Dev proxy and the Vercel function add the API keys.
      "import.meta.env.VITE_API_URL": JSON.stringify(""),
      "import.meta.env.VITE_STOREFRONT_URL": JSON.stringify(storefrontUrl),
      "import.meta.env.VITE_APP_URL": JSON.stringify(appUrl),
    },
    server: {
      port: 4173,
      strictPort: true,
      proxy: apiProxy,
    },
    preview: {
      port: 4173,
      strictPort: true,
      proxy: apiProxy,
    },
  };
});
