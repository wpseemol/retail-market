import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/", label: "Overview", end: true },
  { to: "/super-admin", label: "Super Admin" },
  { to: "/admin", label: "Admin" },
  { to: "/moderator", label: "Moderator" },
  { to: "/vendor", label: "Vendor" },
] as const;

export function DashboardLayout() {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-[var(--border)] bg-[var(--bg-surface)] p-5 md:border-b-0 md:border-r">
        <p className="mb-6 text-lg font-semibold tracking-tight text-[var(--brand-primary)]">
          Niyenin Dashboard
        </p>
        <nav className="flex flex-wrap gap-2 md:flex-col">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={"end" in link ? link.end : false}
              className={({ isActive }) =>
                [
                  "rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-[var(--brand-primary)] text-white"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]",
                ].join(" ")
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
