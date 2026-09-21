type RolePageProps = {
  role: "Super Admin" | "Admin" | "Moderator" | "Vendor";
};

export function RolePage({ role }: RolePageProps) {
  return (
    <section className="max-w-2xl">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-primary">
        Workspace
      </p>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-text-primary">
        {role}
      </h1>
      <p className="text-sm leading-relaxed text-text-secondary">
        Dedicated {role} module. Keep role tools here — separate from the
        customer storefront.
      </p>

      <div className="mt-6 rounded border border-border-default bg-bg-surface p-4">
        <p className="text-sm text-text-secondary">
          This workspace is ready for {role.toLowerCase()}-specific pages,
          matching Niyenin storefront colors, typography, and controls.
        </p>
      </div>
    </section>
  );
}
