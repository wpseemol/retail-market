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
  { to: "/super-admin", label: "Super Admin", roles: ["super_admin"] },
  { to: "/admin", label: "Admin", roles: ["admin", "super_admin"] },
  { to: "/moderator", label: "Moderator", roles: ["moderator", "super_admin"] },
  { to: "/vendor", label: "Vendor", roles: ["vendor", "super_admin"] },
];

export function DashboardLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const links = allLinks.filter(
    (link) =>
      user && (user.role === "super_admin" || link.roles.includes(user.role)),
  );

  return (
    <div className="min-h-screen bg-bg-subtle md:grid md:grid-cols-[248px_1fr]">
      <aside className="border-b border-border-default bg-bg-surface p-5 md:border-b-0 md:border-r">
        <div className="mb-6 flex items-center gap-3">
          <img
            src="/logo/niyenin-dark.png"
            alt="Niyenin"
            className="h-8 w-auto"
          />
          <div>
            <p className="text-sm font-semibold text-text-primary">Niyenin</p>
            <p className="text-xs text-text-secondary">Staff Dashboard</p>
          </div>
        </div>

        {user ? (
          <div className="mb-5 rounded border border-border-default bg-bg-subtle px-3 py-2.5">
            <p className="text-sm font-medium text-text-primary">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-xs capitalize text-text-secondary">
              {user.role.replace("_", " ")}
            </p>
          </div>
        ) : null}

        <nav className="flex flex-wrap gap-2 md:flex-col">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                [
                  "rounded px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-primary text-white"
                    : "text-text-secondary hover:bg-brand-tint hover:text-brand-deep",
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
          className="mt-6 h-10 w-full rounded border border-border-default text-sm font-medium text-text-secondary transition-colors hover:border-brand-primary hover:text-brand-primary"
        >
          Log out
        </button>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border-default bg-bg-surface px-6">
          <p className="text-sm font-medium text-text-secondary">
            Management console
          </p>
          <ApiHealthBadge />
        </header>
        <main className="flex-1 p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
