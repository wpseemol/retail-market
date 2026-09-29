import type { Metadata } from "next";
import AuthPage from "@/components/auth/AuthPage";
import { createPageMetadata, siteConfig } from "@/config/site";

export const metadata: Metadata = createPageMetadata({
  title: "Create account",
  description: `Create a free ${siteConfig.name} shopper account.`,
  path: "/register",
  noIndex: true,
});

export default function RegisterRoutePage() {
  return <AuthPage mode="register" />;
}
