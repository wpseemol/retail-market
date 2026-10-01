import AuthShell from "@/components/auth/AuthShell";

// Shared by /login and /register so the shell stays mounted and can animate between them.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthShell />
      {children}
    </>
  );
}
