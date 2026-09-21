type RolePageProps = {
  role: "Super Admin" | "Admin" | "Moderator" | "Vendor";
};

export function RolePage({ role }: RolePageProps) {
  return (
    <section className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">{role}</h1>
      <p className="text-[var(--text-muted)]">
        Placeholder workspace for the {role} module. Build role-specific pages
        here against <code>TARGET_REQUIREMENTS.md</code>.
      </p>
    </section>
  );
}
