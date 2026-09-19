import type { Metadata } from "next";
import AuthPage from "@/components/auth/AuthPage";

export const metadata: Metadata = {
    title: "Register | Retail Market",
    description: "Create a Retail Market account or log in.",
};

export default function RegisterRoutePage() {
    return <AuthPage />;
}
