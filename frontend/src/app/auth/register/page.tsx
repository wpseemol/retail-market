import type { Metadata } from "next";
import AuthPage from "@/components/auth/AuthPage";
import { createPageMetadata, siteConfig } from "@/config/site";

export const metadata: Metadata = createPageMetadata({
    title: "Register",
    description: `Create a ${siteConfig.name} account or log in.`,
    path: "/auth/register",
    noIndex: true,
});

export default function RegisterRoutePage() {
    return <AuthPage />;
}
