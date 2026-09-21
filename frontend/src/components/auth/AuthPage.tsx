import Link from "next/link";
import LoginForm from "./LoginForm";
import SignUpForm from "./SignUpForm";
import ApiHealthBadge from "@/components/ApiHealthBadge";

export default function AuthPage() {
    return (
        <main className="flex-1 bg-bg-base">
            <div className="border-b border-border-default bg-bg-subtle/60">
                <div className="container mx-auto px-4 sm:px-6 py-3">
                    <nav aria-label="Breadcrumb" className="text-sm">
                        <ol className="flex items-center gap-2 text-text-secondary">
                            <li>
                                <Link
                                    href="/"
                                    className="hover:text-brand-primary transition-colors"
                                >
                                    Home
                                </Link>
                            </li>
                            <li aria-hidden="true" className="text-text-secondary/60">
                                &gt;
                            </li>
                            <li className="text-text-primary font-medium">
                                Account
                            </li>
                        </ol>
                    </nav>
                </div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-14 lg:py-16">
                <div className="mb-6 flex justify-end">
                    <ApiHealthBadge />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 xl:gap-24 max-w-5xl mx-auto">
                    <SignUpForm />
                    <LoginForm />
                </div>
            </div>
        </main>
    );
}
