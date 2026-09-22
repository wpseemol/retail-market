import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { StaffRole } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { AuthSessionGuard } from "./AuthSessionGuard";

const ROLE_HOME: Record<StaffRole, string> = {
  super_admin: "/super-admin",
  admin: "/admin",
  moderator: "/moderator",
  vendor: "/vendor",
};

type ProtectedRouteProps = {
  roles?: StaffRole[];
};

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const location = useLocation();
  const { token, refreshToken, user } = useAuthStore();

  // No access or refresh token → must log in again (secure).
  if (!token || !refreshToken || !user) {
    return (
      <Navigate
        to="/login?reason=session_expired"
        replace
        state={{ from: location }}
      />
    );
  }

  if (roles && !roles.includes(user.role) && user.role !== "super_admin") {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }

  return (
    <AuthSessionGuard>
      <Outlet />
    </AuthSessionGuard>
  );
}
