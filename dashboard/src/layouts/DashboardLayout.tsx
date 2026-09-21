import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ApiHealthBadge } from "../components/ApiHealthBadge";
import { useAuthStore } from "../store/auth";
import type { StaffRole } from "../lib/api";

const allLinks: Array<{
  to: string;
  label: string;
  roles: StaffRole[];
  end?: boolean;
}> = [
  { to: "/", label: "Overview", roles: ["super_admin", "admin"], end: true },
  {
    to: "/super-admin",
    label: "Super Admin",
    roles: ["super_admin"],
  },
  {
    to: "/admin",
    label: "Admin",
    roles: ["admin", "super_admin"],
  },
  {
    to: "/moderator",
    label: "Moderator",
    roles: ["moderator", "super_admin"],
  },
  {
    to: "/vendor",
    label: "Vendor",
    roles: ["vendor", "super_admin"],
  },
];

export function DashboardLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const links = allLinks.filter(
    (link) => user && (user.role === "super_admin" || link.roles.includes(user.role)),
  );

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-[var(--border)] bg-[var(--bg-surface)] p-5 md:border-b-0 md:border-r">
        <p className="mb-2 text-lg font-semibold tracking-tight text-[var(--brand-primary)]">
          Niyenin Dashboard
        </p>
        {user ? (
          <p className="mb-4 text-xs text-[var(--text-muted)]">
            {user.first_name} · {user.role}
          </p>
        ) : null}
        <nav className="flex flex-wrap gap-2 md:flex-col">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
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
        <button
          type="button"
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="mt-6 rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          Log out
        </button>
      </aside>
      <main className="p-6 md:p-8">
        <div className="mb-6 flex justify-end">
          <ApiHealthBadge />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
