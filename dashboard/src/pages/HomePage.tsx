export function HomePage() {
  return (
    <section className="max-w-2xl">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-primary">
        Overview
      </p>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-text-primary">
        Management Dashboard
      </h1>
      <p className="text-sm leading-relaxed text-text-secondary">
        Shared Niyenin design system with the storefront. Manage Super Admin,
        Admin, Moderator, and Vendor workspaces from here.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {[
          "Orders & catalog",
          "Users & roles",
          "Vendors & listings",
          "Reports & moderation",
        ].map((item) => (
          <div
            key={item}
            className="rounded border border-border-default bg-bg-surface px-4 py-3 text-sm text-text-primary"
          >
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
