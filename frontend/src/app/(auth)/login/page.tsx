import type { Metadata } from "next";
import { createPageMetadata, siteConfig } from "@/config/site";

export const metadata: Metadata = createPageMetadata({
  title: "Login",
  description: `Log in to your ${siteConfig.name} account.`,
  path: "/login",
  noIndex: true,
});

// UI lives in app/(auth)/layout.tsx (AuthShell) so switching to /register animates.
export default function LoginRoutePage() {
  return null;
}
