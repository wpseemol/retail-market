import type { Metadata } from "next";
import { createPageMetadata, siteConfig } from "@/config/site";

export const metadata: Metadata = createPageMetadata({
  title: "Create account",
  description: `Create a free ${siteConfig.name} shopper account.`,
  path: "/register",
  noIndex: true,
});

// UI lives in app/(auth)/layout.tsx (AuthShell) so switching to /login animates.
export default function RegisterRoutePage() {
  return null;
}
