import type { Metadata } from "next";
import AuthPage from "@/components/auth/AuthPage";
import { createPageMetadata, siteConfig } from "@/config/site";

export const metadata: Metadata = createPageMetadata({
    title: "Login",
    description: `Sign up or log in to your ${siteConfig.name} account.`,
    path: "/auth/login",
    noIndex: true,
});

export default function LoginRoutePage() {
    return <AuthPage />;
}
