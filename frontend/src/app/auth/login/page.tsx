import type { Metadata } from "next";
import AuthPage from "@/components/auth/AuthPage";

export const metadata: Metadata = {
    title: "Login | Retail Market",
    description: "Sign up or log in to your Retail Market account.",
};

export default function LoginRoutePage() {
    return <AuthPage />;
}
