import AuthShell from "@/components/auth/AuthShell";
import { getSiteSettings } from "@/lib/siteSettings";

// Shared by /login and /register so the shell stays mounted and can animate between them.
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  return (
    <>
      <AuthShell loginImageUrl={settings.login_image?.path ?? null} />
      {children}
    </>
  );
}
