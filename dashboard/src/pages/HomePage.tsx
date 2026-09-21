export function HomePage() {
  return (
    <section className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">
        Management Dashboard
      </h1>
      <p className="text-[var(--text-muted)]">
        Plain React + ReactDOM SPA for Super Admin, Admin, Moderator, and Vendor
        workspaces. Storefront stays in <code>frontend/</code>; API stays in{" "}
        <code>backend/</code>.
      </p>
    </section>
  );
}
